import { getMongoClient } from "./services/database";
import axios from "axios";
import * as AWS from "aws-sdk";
import * as unicodedata from "unorm";

const secretsManager = new AWS.SecretsManager();
const SECRET_ARN = process.env.DOCUMENTDB_SECRET_ARN || "";
const DOCUMENTDB_URI = process.env.DOCUMENTDB_CLUSTER_URI || "";
const BLIZZARD_SECRET_NAME = "BlizzardAPICredentials";
const GUILD_COLLECTION = "guild_members";

function cleanCharacterName(name: string): string {
    return unicodedata.nfkd(name) 
        .replace(/[^A-Za-z0-9-_+=.@!]/g, ""); 
}

async function getBlizzardToken() {
    const secretData = await secretsManager.getSecretValue({ SecretId: BLIZZARD_SECRET_NAME }).promise();
    const credentials = JSON.parse(secretData.SecretString || "{}");

    const tokenResponse = await axios.post(
        "https://oauth.battle.net/token",
        new URLSearchParams({ grant_type: "client_credentials" }).toString(),
        { auth: { username: credentials.client_id, password: credentials.client_secret } }
    );

    return tokenResponse.data.access_token;
}

async function fetchGuildRoster(accessToken: string, guildName: string, realm: string) {
    const response = await axios.get(
        `https://eu.api.blizzard.com/data/wow/guild/${realm}/${guildName}/roster`,
        { headers: { Authorization: `Bearer ${accessToken}` }, params: { namespace: "profile-eu" } }
    );

    return response.data.members;
}

async function fetchCharacterProfessions(accessToken: string, characterName: string, realm: string) {
    try {
        const response = await axios.get(
            `https://eu.api.blizzard.com/profile/wow/character/${realm}/${characterName}/professions`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { namespace: "profile-eu" }
            }
        );

        console.log(`🔍 Raw Blizzard API Response for ${characterName}:`, JSON.stringify(response.data, null, 2));

        interface ProfessionTier {
            tier: { name: string };
            skill_points: number;
            max_skill_points: number;
            known_recipes: { name: string }[]; 
        }
        

        interface Profession {
            profession: { id: number; name: string };
            tiers: ProfessionTier[];
        }

        const primaryProfessions: Profession[] = response.data.primaries || [];

        const khazAlgarProfessions = primaryProfessions
            .map((profession: Profession) => {
                const khazAlgarTier = profession.tiers.find(
                    (tier: ProfessionTier) => tier.tier.name.startsWith("Khaz Algar")
                );
                
                if (!khazAlgarTier) return null;

                return {
                    id: profession.profession.id,
                    name: profession.profession.name,
                    skill_points: `${khazAlgarTier.skill_points}/${khazAlgarTier.max_skill_points}`,
                    recipes: khazAlgarTier.known_recipes?.map(recipe => recipe.name) ?? [],
                };
            })
            .filter((prof): prof is NonNullable<typeof prof> => prof !== null); // Remove null values
        
        console.log(`✅ Extracted Khaz Algar Professions for ${characterName}:`, khazAlgarProfessions);
        return khazAlgarProfessions;
    } catch (error) {
        console.error(`❌ Failed to fetch professions for ${characterName}:`, (error as Error).message);
        return [];
    }
}

async function fetchCharacterFromDB(characterName: string, realm?: string) {
    console.log(`🔍 Searching for character: "${characterName}" (Realm: ${realm || "ANY"})`);

    const client = await getMongoClient();
    const db = client.db("CraftingBotDB");
    const collection = db.collection("guild_members");

    let query = realm
        ? { character_realm: `${characterName}#${realm}` }
        : { character_name: characterName }; 

    const characters = await collection.find(query).toArray();

    if (!characters.length) {
        console.log(`❌ No character found for ${characterName}.`);
        return null;
    }

    console.log(`✅ Found ${characters.length} match(es) for ${characterName}.`, characters);
    return characters.length === 1 ? characters : characters; 
}

async function fetchCraftersForRecipe(recipeName: string) {
    console.log(`🔍 Searching for crafters of "${recipeName}"...`);

    const client = await getMongoClient();
    const db = client.db("CraftingBotDB");
    const collection = db.collection("guild_members");

    const crafters = await collection
        .find({ "khaz_algar_professions.recipes": { $regex: new RegExp(`^${recipeName}$`, "i") } })
        .toArray();

    if (!crafters.length) {
        console.log(`❌ No crafters found for "${recipeName}".`);
        return null;
    }

    return crafters.map(crafter => ({
        character_name: crafter.character_name,
        realm: crafter.realm,
        level: crafter.level,
        profession: crafter.khaz_algar_professions
            .filter((prof: { name: string; skill_points: string; recipes: string[] }) =>
                prof.recipes.includes(recipeName)
            )
            .map((prof: { name: string; skill_points: string }) => ({
                name: prof.name,
                skill_points: prof.skill_points
            }))
    }));
}


async function storeGuildMembersInDB(members: any[], accessToken: string) {
    console.log(`🔍 Attempting to store ${members.length} members in DocumentDB`);

    const client = await getMongoClient();
    console.log("✅ Connected to DocumentDB");

    const db = client.db("CraftingBotDB");
    const collection = db.collection(GUILD_COLLECTION);

    if (!Array.isArray(members) || members.length === 0) {
        console.error("❌ Error: No members to process!");
        return;
    }

    for (const member of members) {
        let characterName = "";
        let characterRealm = "";

        try {
            if (!member.character || !member.character.name || !member.character.realm) {
                console.error("❌ Skipping entry - Invalid member format:", JSON.stringify(member));
                continue;
            }

            characterName = member.character.name.trim();
            characterRealm = member.character.realm.slug.trim(); 

            console.log(`🔍 Original Character Name: "${characterName}" | Realm: "${characterRealm}"`);

            characterName = cleanCharacterName(characterName.toLowerCase());
            characterRealm = characterRealm.toLowerCase();
            const characterKey = `${characterName}#${characterRealm}`;

            console.log(`📝 Attempting to insert/update: ${characterKey}`);

            const professions = await fetchCharacterProfessions(accessToken, characterName, characterRealm);

            await collection.updateOne(
                { character_realm: characterKey },
                {
                    $set: {
                        character_name: characterName,
                        realm: characterRealm, 
                        level: member.character.level || 0,
                        khaz_algar_professions: professions 
                    }
                },
                { upsert: true, retryWrites: false }
            );

            console.log(`✅ Successfully inserted/updated ${characterKey}`);
        } catch (error: unknown) {
            console.error(`❌ Failed to insert ${characterName}:`, (error as Error).message);
        }
    }
    console.log("✅ Finished processing all guild members.");
}

export async function lambdaHandler(event: any) {
    console.log("🚀 Lambda execution started!", JSON.stringify(event, null, 2));

    const isApiGatewayEvent = event.requestContext && event.httpMethod === "GET";

    if (isApiGatewayEvent) {
        const pathParams = event.pathParameters || {};
        const characterName = pathParams.name;
        const realm = pathParams.realm;

        if (pathParams.recipe) {
            const recipeName = decodeURIComponent(pathParams.recipe);
            console.log(`🔍 Looking up who can craft "${recipeName}"...`);

            const crafters = await fetchCraftersForRecipe(recipeName);

            if (!crafters) {
                return { statusCode: 404, body: JSON.stringify({ message: "No crafters found for this recipe." }) };
            }

            console.log(`✅ Found ${crafters.length} crafters.`);
            return {
                statusCode: 200,
                body: JSON.stringify({ recipe: recipeName, crafters }, null, 2),
                headers: { "Content-Type": "application/json" }
            };
        }

        if (!characterName) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing character name" }) };
        }

        const cleanedCharacter = cleanCharacterName(characterName.toLowerCase());

        if (realm) {
            const cleanedRealm = realm.toLowerCase();
            console.log(`🔍 Fetching professions for ${cleanedCharacter}#${cleanedRealm}...`);
            const characterData = await fetchCharacterFromDB(cleanedCharacter, cleanedRealm);

            if (!characterData) {
                return { statusCode: 404, body: JSON.stringify({ message: "Character not found" }) };
            }

            console.log(`✅ Returning API response:\n`, JSON.stringify(characterData, null, 2));
            return {
                statusCode: 200,
                body: JSON.stringify(characterData, null, 2),
                headers: { "Content-Type": "application/json" }
            };
        } else {
            console.log(`🔍 Searching for character: "${cleanedCharacter}" across all realms...`);
            const matches = await fetchCharacterFromDB(cleanedCharacter);

            if (!matches || matches.length === 0) {
                return { statusCode: 404, body: JSON.stringify({ message: "Character not found on any known realm" }) };
            }

            if (Array.isArray(matches) && matches.length > 1) {
                console.log(`✅ Multiple matches found for ${cleanedCharacter}:`, matches);
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: "Multiple matches found",
                        characters: matches.map((char) => ({
                            name: char.character_name,
                            realm: char.realm,
                            level: char.level
                        }))
                    }),
                    headers: { "Content-Type": "application/json" }
                };
            }

            console.log(`✅ Unique match found for ${cleanedCharacter}:`, matches[0]);
            return {
                statusCode: 200,
                body: JSON.stringify(matches[0], null, 2),
                headers: { "Content-Type": "application/json" }
            };
        }
    }

    if (!isApiGatewayEvent && event.action === "updateDatabase") {
        console.log("🔄 Updating Database with Guild Members...");
        try {
            const accessToken = await getBlizzardToken();
            const guildName = "the-asylum";
            const realm = "quelthalas";

            console.log("✅ Fetching guild members from Blizzard API...");
            const members = await fetchGuildRoster(accessToken, guildName, realm);

            console.log(`✅ Storing ${members.length} members in DocumentDB...`);
            await storeGuildMembersInDB(members, accessToken);

            return { statusCode: 200, body: JSON.stringify({ message: "Guild members updated in DocumentDB!" }) };
        } catch (error: unknown) {
            console.error("❌ Failed to update guild members:", (error as Error).message);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to update database" }) };
        }
    }

    return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request" })
    };
}
