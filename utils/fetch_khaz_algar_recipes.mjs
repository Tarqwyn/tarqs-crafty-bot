import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parseStringPromise } from "xml2js";

dotenv.config();

const ACCESS_TOKEN = process.env.BLIZZARD_ACCESS_TOKEN;
const BASE_URL = "https://eu.api.blizzard.com/data/wow";
const LOCALE = "en_GB";
const OUTPUT_PATH = path.resolve("../lambda/static/khaz_algar_recipes.json");
const WOWHEAD_BASE_URL = "https://www.wowhead.com/item=";
const NAMESPACE = "static-11.1.0_59095-eu";

// Crafting professions only (ignore gathering)
const CRAFTING_PROFESSIONS = {
    164: "Blacksmithing",
    165: "Leatherworking",
    171: "Alchemy",
    197: "Tailoring",
    202: "Engineering",
    333: "Enchanting",
    755: "Jewelcrafting",
    773: "Inscription",
    2827: "Cooking"
};

async function fetchNamespace() {
    const url = `${BASE_URL}/profession/index?namespace=static-eu&locale=${LOCALE}`;
    const headers = { "Authorization": `Bearer ${ACCESS_TOKEN}`, "Accept": "application/json" };

    const response = await fetch(url, { headers });
    if (!response.ok) {
        console.error(`❌ Failed to fetch namespace: ${response.status}`);
        return null;
    }

    const data = await response.json();
    const namespaceUrl = data._links.self.href;
    const namespaceMatch = namespaceUrl.match(/namespace=([\w.-]+)/);
    const NAMESPACE = namespaceMatch ? namespaceMatch[1] : null;

    if (NAMESPACE) {
        console.log(`✅ Detected Blizzard Namespace: ${NAMESPACE}`);
        return NAMESPACE;
    } else {
        console.error("❌ Failed to extract namespace.");
        return null;
    }
}

async function fetchWowheadReagents(spellId) {
    if (!spellId) return { reagents: [], optionalReagents: [] };

    const url = `https://www.wowhead.com/spell=${spellId}`;
    console.log(`🔍 Fetching reagent data from Wowhead: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`❌ Failed to fetch Wowhead spell data for spell ${spellId}`);
            return { reagents: [], optionalReagents: [] };
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        let reagents = [];
        let optionalReagents = [];

        // Helper function to clean reagent names
        const cleanName = (name) => name.replace(/\s*\(#\d+\)$/, "").trim(); // Removes (#num) from name

        // Locate "Reagents" section
        const reagentsTable = $("h2:contains('Reagents')").next("table.icon-list");
        if (reagentsTable.length) {
            reagentsTable.find("tr").each((_, row) => {
                const quantity = $(row).attr("data-icon-list-quantity");
                const nameElement = $(row).find("td > a");
                let name = nameElement.text().trim();
                name = cleanName(name); // Remove Wowhead (#num) reference
                const href = nameElement.attr("href");
                const itemId = href ? (href.match(/item=(\d+)/) || [])[1] : null;

                if (name && quantity) {
                    const reagent = {
                        name: name,
                        quantity: parseInt(quantity, 10)
                    };
                    if (itemId) reagent.itemId = itemId; // Only include itemId if it exists
                    reagents.push(reagent);
                }
            });
        }

        // Locate "Optional Reagents" section
        const optionalReagentsTable = $("h2:contains('Optional Reagents')").next("table.icon-list");
        if (optionalReagentsTable.length) {
            optionalReagentsTable.find("tr").each((_, row) => {
                const quantity = $(row).attr("data-icon-list-quantity");
                const nameElement = $(row).find("td > a");
                let name = nameElement.text().trim();
                name = cleanName(name); // Remove Wowhead (#num) reference
                const href = nameElement.attr("href");
                const itemId = href ? (href.match(/item=(\d+)/) || [])[1] : null;

                if (name && quantity) {
                    const reagent = {
                        name: name,
                        quantity: parseInt(quantity, 10)
                    };
                    if (itemId) reagent.itemId = itemId; // Only include itemId if it exists
                    optionalReagents.push(reagent);
                }
            });

            // Remove optional reagents from the main reagents array (de-duplication)
            const optionalNames = optionalReagents.map(item => item.name);
            reagents = reagents.filter(item => !optionalNames.includes(item.name));
        }

        console.log(`✅ Found ${reagents.length} Reagents and ${optionalReagents.length} Optional Reagents for spell ${spellId}.`);
        return { reagents, optionalReagents };
    } catch (error) {
        console.error(`❌ Error fetching Wowhead reagents for spell ${spellId}:`, error.message);
        return { reagents: [], optionalReagents: [] };
    }
}

async function fetchItemMediaUrl(itemId) {
    if (!itemId) return undefined; // Ensure we don't fetch media for null items.

    const url = `https://eu.api.blizzard.com/data/wow/media/item/${itemId}?namespace=${NAMESPACE}`;
    const headers = { Authorization: `Bearer ${ACCESS_TOKEN}` };

    try {
        console.log(`🔍 Fetching media for item ID: ${itemId}`);
        const response = await fetch(url, { headers });
        if (!response.ok) {
            console.error(`❌ Failed to fetch media for item ${itemId} (Status: ${response.status})`);
            return undefined;
        }

        const data = await response.json();
        const mediaUrl = data?.assets?.find((asset) => asset.key === "icon")?.value;
        console.log(`✅ Found media URL: ${mediaUrl}`);
        return mediaUrl;
    } catch (error) {
        console.error(`❌ Error fetching media for item ${itemId}:`, error.message);
        return undefined;
    }
}

async function fetchCraftedItemId(recipeName) {
    const recipeNameFixes = {
        "Gardener's Basket": "219861",
        "Artisan Gardening Hat": "222847", 
        "Artisan Enchanter's Hat": "222849",
        "Convincingly Realistic Jumper Cables": "221955",
        "Cavalry's March" : "223650",
        "Scout's March" : "223653",
        "Defender's March": "223656",
        "Glimmering Critical Strike": "223659",
        "Radiant Critical Strike": "223662",
        "Glimmering Haste": "223663",
        "Radiant Haste": "223674",
        "Glimmering Mastery" : "223668",
        "Radiant Mastery": "223677",
        "Glimmering Versatility": "223671",
        "Radiant Versatility": "223680",
        "Cursed Critical Strike": "223787",
        "Cursed Haste": "223790",
        "Cursed Mastery": "223793",
        "Cursed Versatility": "223796",
        "Authority of Air": "223775",
        "Authority of Fiery Resolve": "223778",
        "Authority of Radiant Power": "223778",
        "Authority of Storms": "223781",
        "Council's Guile": "223759",
        "Stormrider's Fury": "223762",
        "Stonebound Artistry": "223765",
        "Oathsworn's Tenacity": "223768",
        "Authority of the Depths": "223784",
        "Stormrider's Agility": "223683",
        "Council's Intellect": "223686",
        "Crystalline Radiance": "223692",
        "Oathsworn's Strength": "223689",
        "Algari Deftness": "223695",
        "Algari Finesse": "223698",
        "Algari Ingenuity": "223701",
        "Algari Perception": "223704",
        "Algari Resourcefulness": "223707",
        "Whisper of Armored Avoidance": "223710",
        "Chant of Armored Avoidance": "223713",
        "Whisper of Armored Leech": "223716",
        "Chant of Armored Leech": "223719",
        "Whisper of Armored Speed": "223722",
        "Chant of Armored Speed": "223725",
        "Whisper of Silken Avoidance": "223728",
        "Chant of Winged Grace": "223731",
        "Whisper of Silken Leech": "223734",
        "Chant of Leeching Fangs": "223737",
        "Whisper of Silken Speed": "223740",
        "Chant of Burrowing Rapidity": "223800",
        "Deadly Sapphire": "213467",
    };

    if (recipeNameFixes.hasOwnProperty(recipeName)) {
        recipeName = recipeNameFixes[recipeName];
    }
    const encodedItemName = encodeURIComponent(recipeName.replace(/ /g, "%20"));
    const url = `${WOWHEAD_BASE_URL}${encodedItemName}&xml`;

    try {
        console.log(`🔍 Fetching item info from Wowhead: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`❌ Failed to fetch Wowhead data for: ${recipeName}`);
            return { itemId: null, spellId: null };
        }

        const xml = await response.text();
        const parsedXml = await parseStringPromise(xml);

        // 🔹 Extract Crafted Item ID
        const itemId = parsedXml?.wowhead?.item?.[0]?.$.id || null;

        // 🔹 Extract Spell ID from JSON in <json> node
        let spellId = null;
        const jsonText = parsedXml?.wowhead?.item?.[0]?.json?.[0];

        if (jsonText) {
            try {
                // Remove CDATA if present and parse JSON safely
                const sanitizedJson = jsonText.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");
                const jsonData = JSON.parse(`{` + sanitizedJson + `}`);
                spellId = jsonData?.sourcemore?.[0]?.ti || null;
            } catch (jsonError) {
                console.warn(`⚠️ Warning: Invalid JSON for ${recipeName}. Skipping Spell ID.`);
            }
        } else {
            console.warn(`⚠️ Warning: No JSON data found for ${recipeName}.`);
        }

        console.log(`✅ Found Item ID: ${itemId}, Spell ID: ${spellId}`);
        return { itemId, spellId };
    } catch (error) {
        console.error(`❌ Error fetching Wowhead data for ${recipeName}:`, error);
        return { itemId: null, spellId: null };
    }
}

async function fetchRecipesForTiers(khazAlgarTiers) {
    let allRecipes = [];
    const UTILITY_RECIPES = [
        "Recraft Equipment", "Unraveling", "Prospecting", "Milling", "Disenchanting",
        "Smelting", "Skinning", "Alchemy Transmute", "Alchemy Cauldrons", "Alchemy Oils",
        "Enchanting Illusions", "Enchanting Wands", "Engineering Explosives",
        "Lockpicking", "Wild Experimentation", "Thaumaturgy", "Meticulous Experimentation", "Neutralize Concoctions",
        "Volatile Weaving", "Volatile Stone", "Mercurial Storms", "Mercurial Blessings", "Mercurial Herbs", "Ominous Herbs",
        "Ominous Gloom", "Ominous Call", "Gleaming Chaos", "Volatile Coalescence", "Ominous Coalescence", "Gleaming Shatter",
        "Mercurial Coalescence","Gleaming Glory", "Scour Through Scrap", "Pilfer Through Parts", "Invent", "Disassemble Invention",
        "Shatter Essence", "Shatter Essence", "Algari Prospecting", "Algari Crushing", "Khaz Algar Milling",
        "Transcribe: Ascension", "Transcribe: Vivacity", "Transcribe: Symbiosis", "Transcribe: Radiance",
    ];

    for (const { professionName, professionId, tierId } of Object.values(khazAlgarTiers)) {
        const url = `${BASE_URL}/profession/${professionId}/skill-tier/${tierId}?namespace=static-eu&locale=${LOCALE}`;
        const headers = { "Authorization": `Bearer ${ACCESS_TOKEN}`, "Accept": "application/json" };

        console.log(`🔹 Fetching recipes for ${professionName} (Profession ID: ${professionId}, Tier ID: ${tierId})`);

        const response = await fetch(url, { headers });

        if (!response.ok) {
            console.error(`❌ Failed to fetch recipes for ${professionName}`);
            continue;
        }

        const data = await response.json();

        if (!data.categories) {
            console.warn(`⚠️ No recipe categories found for ${professionName}`);
            continue;
        }

        let professionRecipes = [];

        for (const category of data.categories) {
            if (!category.recipes) continue;
    
            const recipes = await Promise.all(
                category.recipes
                    .filter(recipe => {
                        const recipeName = recipe.name?.["en_GB"] || recipe.name?.["en_US"] || recipe.name || "Unknown";
                        if (UTILITY_RECIPES.includes(recipeName)) {
                            console.log(`⚠️ Skipping utility recipe: ${recipeName}`);
                            return false;
                        }
                        return true;
                    })
                    .map(async (recipe) => {
                    const recipeName = recipe.name?.["en_GB"] || recipe.name?.["en_US"] || recipe.name || "Unknown";
                    const linkedId = await fetchCraftedItemId(recipeName);
                    const mediaUrl = await fetchItemMediaUrl(linkedId.itemId);
                    const reagents = await fetchWowheadReagents(linkedId.spellId);
    
                    return {
                        id: recipe.id,
                        name: recipeName,
                        craftedItemId: linkedId.itemId,
                        spellId: linkedId.spellId,
                        mediaUrl: mediaUrl,
                        reagents: reagents,
                    };
                })
            );
    
            professionRecipes = professionRecipes.concat(recipes);
        }

        if (professionRecipes.length > 0) {
            console.log(`✅ Found ${professionRecipes.length} recipes for ${professionName}`);
            allRecipes = allRecipes.concat(professionRecipes);
        } else {
            console.warn(`⚠️ No valid recipes extracted for ${professionName}`);
        }
    }

    return allRecipes;
}

async function fetchProfessionDetails(professionId, professionHref) {
    const headers = { "Authorization": `Bearer ${ACCESS_TOKEN}`, "Accept": "application/json" };
    const response = await fetch(professionHref, { headers });

    if (!response.ok) {
        console.error(`❌ Failed to fetch details for ${professionHref}`);
        return null;
    }

    const data = await response.json();
    
    // Find the `Khaz Algar` skill tier ID
    const khazAlgarTier = data.skill_tiers.find(tier => 
        tier.name[LOCALE].includes("Khaz Algar")
    );

    return khazAlgarTier ? { professionId, tierId: khazAlgarTier.id } : null;
}

async function fetchKhazAlgarTiers() {
    const namespace = await fetchNamespace();
    if (!namespace) return;

    const url = `${BASE_URL}/profession/index?namespace=${namespace}&locale=${LOCALE}`;
    const headers = { "Authorization": `Bearer ${ACCESS_TOKEN}`, "Accept": "application/json" };

    const response = await fetch(url, { headers });
    if (!response.ok) {
        console.error(`❌ Failed to fetch profession list: ${response.status}`);
        return;
    }

    const data = await response.json();
    let khazAlgarTiers = {};

    for (const profession of data.professions) {
        if (!CRAFTING_PROFESSIONS[profession.id]) continue; // Ignore gathering

        const tierInfo = await fetchProfessionDetails(profession.id, profession.key.href);
        if (tierInfo) {
            // Store both professionId and tierId
            khazAlgarTiers[profession.id] = {
                professionName: CRAFTING_PROFESSIONS[profession.id],
                professionId: profession.id,
                tierId: tierInfo.tierId
            };
        }
    }

    console.log("✅ Extracted Khaz Algar Tier IDs:", khazAlgarTiers);
    return khazAlgarTiers;
}

async function generateKhazAlgarRecipeJSON() {
    const khazAlgarTiers = await fetchKhazAlgarTiers();
    if (!khazAlgarTiers) return;

    const allRecipes = await fetchRecipesForTiers(khazAlgarTiers);

    try {
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allRecipes, null, 2));
        console.log(`✅ Saved ${allRecipes.length} Khaz Algar recipes to ${OUTPUT_PATH}`);
    } catch (error) {
        console.error(`❌ Failed to write JSON file: ${error.message}`);
    }
}

generateKhazAlgarRecipeJSON();
