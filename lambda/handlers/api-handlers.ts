import { getMongoClient } from "../services/database";
import {
  ItemDocument,
  SpecialismDocument,
  CrafterDocument,
  Profession,
} from "../types/types";

export async function fetchSpecialismForRecipe(recipeName: string) {
  console.log(`🔍 Searching for specialism of "${recipeName}"...`);

  const client = await getMongoClient();
  const db = client.db("CraftingBotDB");
  const specialismCollection = db.collection<SpecialismDocument>("Specialism");
  const specialisms = await specialismCollection.find({}).toArray();

  console.log(`🔍 Found ${specialisms.length} specialisms.`);
  console.log(
    `📝 Sample specialism document:`,
    JSON.stringify(specialisms[0], null, 2),
  );

  let foundSpecialism = null;
  for (const specialism of specialisms) {
    console.log(`🔎 Checking specialism: ${specialism._id}`);

    if (!Array.isArray(specialism.crafted_items)) {
      console.error(
        `❌ specialism.crafted_items is NOT an array for: ${specialism._id}`,
      );
      continue;
    }

    for (const category of specialism.crafted_items) {
      if (category.items.includes(recipeName)) {
        foundSpecialism = specialism;
        break;
      }
    }
    if (foundSpecialism) break;
  }

  if (!foundSpecialism) {
    console.log(`❌ No matching specialism found for "${recipeName}".`);
    return null;
  }

  console.log(`✅ Found Specialism: ${foundSpecialism._id}`);
  return foundSpecialism;
}

async function fetchCraftersWithScore(recipeName: string) {
  console.log(`🔍 Searching for crafters of "${recipeName}"...`);

  const client = await getMongoClient();
  const db = client.db("CraftingBotDB");
  const itemsCollection = db.collection<ItemDocument>("craftable_items");
  const item = await itemsCollection.findOne({ name: recipeName });

  if (!item) {
    console.log(`❌ No item found for "${recipeName}".`);
    return { error: `Item "${recipeName}" not found in the database.` };
  }

  console.log(`✅ Found item: ${item.name}, Category: ${item.category}`);

  const specialism = await fetchSpecialismForRecipe(recipeName);
  if (!specialism) {
    console.log(
      `⚠️ No specialism found for "${recipeName}", falling back to general recipe data.`,
    );
  } else {
    console.log(`🔍 Specialisation: ${specialism._id}`);
  }

  const craftersCollection = db.collection<CrafterDocument>("guild_members");
  const crafters = await craftersCollection
    .find({
      "khaz_algar_professions.recipes": {
        $regex: new RegExp(`^${recipeName}$`, "i"),
      },
    })
    .toArray();

  if (!crafters.length) {
    console.log(`❌ No crafters found for "${recipeName}".`);
    return { error: `No crafters available for "${recipeName}".` };
  }

  const craftersWithScore = await Promise.all(
    crafters.map(async (crafter) => {
      const fullCrafterData = await fetchCharacterFromDB(
        crafter.character_name,
        crafter.realm,
      );
      if (!fullCrafterData) return null; // Skip if no data found

      // Ensure we get a single crafter object (not an array)
      const fullCrafter = Array.isArray(fullCrafterData)
        ? fullCrafterData[0]
        : fullCrafterData;
      if (!fullCrafter || !fullCrafter.khaz_algar_professions) return null;

      let professionSkill = 0;
      let totalGeneralRecipes = 0;
      let totalSpecialismRecipes = 0;
      let hasFullCategory = false;
      let professionName: string = "Unknown"; // ✅ Default to prevent errors
      let relevantProfession: {
        name: string;
        skill_points: string;
        recipes: string[];
      } | null = null;

      // ✅ Ensure `professions` is an array of the expected structure
      const professions: Profession[] = fullCrafter.khaz_algar_professions.map(
        (prof: Profession) => ({
          name: prof.name,
          skill_points: prof.skill_points || "0/100",
          recipes: prof.recipes || [],
        }),
      );

      professions.forEach((prof) => {
        if (prof.recipes.includes(recipeName)) {
          // ✅ Process only the relevant profession
          relevantProfession = prof as Profession; // ✅ Explicit casting
          professionName = prof.name; // ✅ Store profession name safely

          professionSkill = parseInt(prof.skill_points.split("/")[0]) || 0; // ✅ Extract numeric skill

          // **2️⃣ Count General Recipes**
          totalGeneralRecipes += prof.recipes.length;

          // **3️⃣ Specialisation Recipes (ONLY IF SPECIALISM EXISTS)**
          if (specialism) {
            specialism.crafted_items.forEach(
              (category: { category: string; items: string[] }) => {
                const totalRecipesInCategory = category.items.length;

                // Count how many recipes the crafter knows in this category
                const knownRecipes = prof.recipes.filter((r: string) =>
                  category.items.includes(r),
                ).length;
                totalSpecialismRecipes += knownRecipes * 5; // **+5 points per specialism recipe**

                // If crafter knows ALL recipes in this category, apply bonus
                if (knownRecipes === totalRecipesInCategory) {
                  hasFullCategory = true;
                }
              },
            );
          }
        }
      });

      if (!relevantProfession) return null; // ✅ Skip if no relevant profession found

      // **4️⃣ Full Completion Bonus (Only if Specialism exists)**
      const completionBonus = specialism && hasFullCategory ? 10 : 0;

      // **Final Score Calculation (Now Works Even Without Specialism)**
      const finalScore =
        professionSkill + // **+1 per skill point**
        totalGeneralRecipes + // **+1 per general recipe**
        totalSpecialismRecipes + // **+5 per specialism recipe (if exists)**
        completionBonus; // **+10 if all recipes in specialism known (if exists)**

      console.log(
        `🛠️ Crafter: ${crafter.character_name}, Profession: ${professionName}, Skill: ${professionSkill}, ` +
          `General Recipes: ${totalGeneralRecipes}, ` +
          `Specialism Recipes: ${totalSpecialismRecipes / 5}, ` + // Convert back to recipe count
          `Full Bonus: ${completionBonus}, Final Score: ${finalScore}`,
      );

      return {
        character_name: crafter.character_name,
        realm: crafter.realm,
        level: crafter.level,
        profession: [{ name: professionName }], // ✅ Use extracted profession name
        skill_points: professionSkill,
        general_recipes: totalGeneralRecipes,
        specialism_recipes: totalSpecialismRecipes / 5, // Convert back to recipe count
        full_bonus: completionBonus,
        final_score: finalScore,
      };
    }),
  );

  // Remove null results (characters who weren’t found or had no relevant profession)
  return craftersWithScore.filter(Boolean);
}

export async function fetchCraftersForRecipe(recipeName: string) {
  console.log(`🔍 Searching for crafters of "${recipeName}"...`);

  const client = await getMongoClient();
  const db = client.db("CraftingBotDB");

  // Fetch item details from the Items collection
  const itemsCollection = db.collection<ItemDocument>("craftable_items");
  const item = await itemsCollection.findOne({ name: recipeName });
  const items = await itemsCollection
    .find({}, { projection: { _id: 0, name: 1 } })
    .toArray();

  if (!items.length) {
    console.log("❌ No items found in the database.");
    return;
  }

  console.log(`✅ Items: (${items.length})`);
  if (!item) {
    console.log(`❌ No item found for "${recipeName}".`);
    return { error: `Item "${recipeName}" not found in the database.` };
  }

  // ✅ Use fetchCraftersWithScore instead of separate DB query
  const craftersWithScore = await fetchCraftersWithScore(recipeName);

  // ✅ Ensure we only process valid data
  if (!Array.isArray(craftersWithScore)) {
    console.log(`❌ Error fetching crafters: ${craftersWithScore.error}`);
    return craftersWithScore; // Return the error object
  }

  if (!craftersWithScore.length) {
    console.log(`❌ No crafters found for "${recipeName}".`);
  }

  // ✅ Filter out null values before mapping
  const validCrafters = craftersWithScore.filter(
    (crafter): crafter is NonNullable<typeof crafter> => crafter !== null,
  );

  // ✅ Format response using only the first profession found
  return {
    name: item.name,
    category: item.category,
    mediaUrl: item.mediaUrl,
    reagents: item.reagents || [],
    crafters: validCrafters
      .map((crafter) => {
        // ✅ Use the first profession in the array (since we no longer store recipes in `profession`)
        const relevantProfession =
          crafter.profession.length > 0 ? crafter.profession[0] : null;

        return {
          character_name: crafter.character_name,
          realm: crafter.realm,
          level: crafter.level,
          profession: relevantProfession
            ? {
                name: relevantProfession.name,
                final_score: crafter.final_score, // ✅ Use final_score instead of skill_points
              }
            : null, // If no relevant profession is found, return null
        };
      })
      .filter((crafter) => crafter.profession !== null), // Remove crafters without a valid profession
  };
}

export async function fetchCharacterFromDB(
  characterName: string,
  realm?: string,
) {
  console.log(
    `🔍 Searching for character: "${characterName}" (Realm: ${realm || "ANY"})`,
  );

  const client = await getMongoClient();
  const db = client.db("CraftingBotDB");
  const collection = db.collection("guild_members");

  const query = realm
    ? { character_realm: `${characterName}#${realm}` }
    : { character_name: characterName };

  const characters = await collection.find(query).toArray();

  if (!characters.length) {
    console.log(`❌ No character found for ${characterName}.`);
    return null;
  }

  console.log(
    `✅ Found ${characters.length} match(es) for ${characterName}.`,
    characters,
  );
  return characters.length === 1 ? characters : characters;
}
