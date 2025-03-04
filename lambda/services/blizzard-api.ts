import axios from "axios";
import * as AWS from "aws-sdk";

const secretsManager = new AWS.SecretsManager();
const BLIZZARD_SECRET_NAME = "BlizzardAPICredentials";
const PATCH = "static-11.1.0_59095-eu";

export async function getBlizzardToken() {
    console.log(`✅ Lets get a secret`);
    const secretData = await secretsManager.getSecretValue({ SecretId: BLIZZARD_SECRET_NAME }).promise();
    const credentials = JSON.parse(secretData.SecretString || "{}");
    console.log(`✅ Secret ${credentials}`);
    const tokenResponse = await axios.post(
        "https://oauth.battle.net/token",
        new URLSearchParams({ grant_type: "client_credentials" }).toString(),
        { auth: { username: credentials.client_id, password: credentials.client_secret } }
    );
    console.log(`✅ Token returned`);
    return tokenResponse.data.access_token;
}

export async function fetchItemMediaUrl(itemId: string, accessToken: string): Promise<string | null> {
    try {
        console.log(`🔍 Fetching media for item ${itemId}...`);
        
        const response = await axios.get(`https://eu.api.blizzard.com/data/wow/media/item/${itemId}`, {
            params: { namespace: PATCH, locale: "en_GB" },
            headers: {
                Authorization: `Bearer ${accessToken}`, // ✅ Pass token as a header
            },
        });

        console.log("🛠️ Blizzard API raw response:", JSON.stringify(response.data, null, 2));

        if (response.data?.assets && response.data.assets.length > 0) {
            const mediaUrl = response.data.assets.find((asset: any) => asset.key === "icon")?.value;
            console.log(`✅ Found media URL: ${mediaUrl}`);
            await new Promise((resolve) => setTimeout(resolve, 200));
            return mediaUrl || null;
        }

        console.log(`⚠️ No media found for item ${itemId}.`);
    } catch (error: any) {
        console.error(`❌ Error fetching media for item ${itemId}:`, error.message);
    }

    return null;
}

export async function fetchGuildRoster(accessToken: string, guildName: string, realm: string) {
    try {
        console.log(`🔍 Fetching guild roster for ${guildName} on ${realm}...using ${accessToken}`);

        const response = await axios.get(
            `https://eu.api.blizzard.com/data/wow/guild/${realm}/${guildName}/roster`,
            { headers: { Authorization: `Bearer ${accessToken}` }, params: { namespace: "profile-eu" } }
        );

        console.log("✅ Blizzard API Response:", JSON.stringify(response.data, null, 2));

        return response.data;
    } catch (error: any) {
        console.error(`❌ Failed to fetch roster for ${realm}/${guildName}`, error.response?.data || error.message);
        return [];
    }
}

export async function fetchCharacterProfessions(accessToken: string, characterName: string, realm: string) {
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

        // List of gathering profession IDs
        const gatheringProfessionIds = new Set([182, 186, 393, 356, 794]);
        // List of utility recipes to filter out
        const utilityRecipes = new Set([
            "Recraft Equipment", "Unraveling", "Prospecting", "Milling", "Disenchanting",
            "Smelting", "Skinning", "Alchemy Transmute", "Alchemy Cauldrons", "Alchemy Oils",
            "Enchanting Illusions", "Enchanting Wands", "Engineering Explosives",
            "Lockpicking"
        ]);
        

        const primaryProfessions: Profession[] = response.data.primaries || [];

        // Filter out gathering professions
        const craftingProfessions = primaryProfessions.filter(
            (profession) => !gatheringProfessionIds.has(profession.profession.id)
        );

        console.log(`🎯 Crafting Professions Only for ${characterName}:`, 
            craftingProfessions.map(p => p.profession.name)
        );
        
        const khazAlgarProfessions = craftingProfessions
            .map((profession: Profession) => {
                const khazAlgarTier = profession.tiers.find(
                    (tier: ProfessionTier) => tier.tier.name.toLowerCase().startsWith("khaz algar")
                );

                if (!khazAlgarTier) return null;

                return {
                    id: profession.profession.id,
                    name: profession.profession.name,
                    skill_points: `${khazAlgarTier.skill_points}/${khazAlgarTier.max_skill_points}`,
                    recipes: (khazAlgarTier.known_recipes ?? [])
                        .map(recipe => recipe?.name ?? "Unknown Recipe")
                        .filter(recipeName => !utilityRecipes.has(recipeName)),
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