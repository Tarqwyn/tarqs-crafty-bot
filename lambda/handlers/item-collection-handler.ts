const recipes = require("../static/khaz_algar_recipes.json");
const specialism = require("../static/specialism.json");
import { getMongoClient } from "../services/database";

const ITEM_COLLECTION = "craftable_items";
const SPECIALISM_COLLECTION = "Specialism";


interface Reagent {
    name: string;
    quantity: number;
    itemId?: string; 
}

interface RecipeItem {
    id: number;
    name: string;
    craftedItemId: string;
    spellId: number;
    mediaUrl?: string;
    reagents: {
      reagents: Reagent[];
      optionalReagents: Reagent[];
    };
}

interface ItemCollection {
    [name: string]: {
      recipeId: number;
      craftedItemId: string | null;
      spellId: number | null;
      mediaUrl?: string;
      reagents: {
        reagents: Reagent[];
        optionalReagents: Reagent[];
      };
    };
}

// Define the type for the crafted item structure
interface CraftedItem {
    category: string;
    items: string[];
  }
  
  // Define the type for the specialism and subspecialism structure
  interface SpecialismSubspecialism {
    crafted_items: CraftedItem[];
    max_points: number;
  }
  
  interface SpecialismData {
    [key: string]: {
      [key: string]: SpecialismSubspecialism; // subspecialism
    };
  }

  interface SpecialismDocument {
    _id: string;  // Ensure _id is treated as a string
    crafted_items: CraftedItem[];
    max_points: number;
  }

/**
 * Loads the item collection from khaz_algar_recipes.json
 */
export async function initItemCollection() {
  console.log("🔄 Initializing item collection with media...");

  try {
      // Connect to DocumentDB
      const client = await getMongoClient();
      const db = client.db("CraftingBotDB");
      const collection = db.collection(ITEM_COLLECTION);
      console.log("✅ Connected to DocumentDB collection.");

      // Remove invalid entries
      const invalidItems = await collection.find({ name: { $exists: false } }).toArray();
      if (invalidItems.length > 0) {
          console.warn(`⚠️ Found ${invalidItems.length} invalid items. Deleting...`);
          await collection.deleteMany({ name: { $exists: false } });
      }

      // Process recipes from JSON.
      const itemCollection: ItemCollection = {};

      for (const recipe of recipes as RecipeItem[]) {
          if (!recipe.name) {
              console.warn(`⚠️ Skipping recipe with missing name:`, recipe);
              continue;  // Skip invalid entries
          }

          itemCollection[recipe.name] = {
              recipeId: recipe.id,
              craftedItemId: recipe.craftedItemId,
              spellId: recipe.spellId,
              mediaUrl: recipe.mediaUrl || undefined, // Optional field
              reagents: {
                  reagents: recipe.reagents.reagents,
                  optionalReagents: recipe.reagents.optionalReagents,
              },
          };
      }

      console.log(`📦 Processed ${Object.keys(itemCollection).length} items with media info.`);

      // Insert or update each item in the collection.
      for (const [name, item] of Object.entries(itemCollection)) {
          const exists = await collection.findOne({ recipeId: item.recipeId });
          if (!exists) {
              await collection.insertOne({ name, ...item });
              console.log(`✅ Inserted: ${name}`);
          } else {
              await collection.updateOne(
                  { recipeId: item.recipeId },
                  { $set: { 
                      name,  // Ensuring the name field is present
                      craftedItemId: item.craftedItemId, 
                      spellId: item.spellId, 
                      mediaUrl: item.mediaUrl || undefined, 
                      reagents: item.reagents
                  }}
              );
              console.log(`♻️ Updated: ${name}`);
          }
      }

      console.log("✅ Item collection (with media) successfully stored in DocumentDB.");
      return { total: Object.keys(itemCollection).length };
  } catch (error: any) {
      console.error("❌ Error initializing item collection:", error.message);
      throw new Error("Failed to initialize item collection with media.");
  }
}


export async function initSpecialismCollection() {
    console.log("🔄 Initializing specialism collection...");
  
    try {
      // Cast the imported specialism data to the SpecialismData type
      const typedSpecialismData = specialism as SpecialismData;
  
      // Connect to DocumentDB
      const client = await getMongoClient();
      const db = client.db("CraftingBotDB");
      const collection = db.collection<SpecialismDocument>("Specialism");
      console.log("✅ Connected to DocumentDB collection.");
  
      // Process specialism data and transform into the structure for MongoDB
      let totalInserted = 0;
      let totalUpdated = 0;
  
      for (const [specialismName, specialismValue] of Object.entries(typedSpecialismData)) {
        for (const [subspecialismName, subspecialismValue] of Object.entries(specialismValue)) {
          // Combine profession and specialism into _id
          const _id = `${specialismName}#${subspecialismName}`;
  
          // Create the document
          const document: SpecialismDocument = {
            _id,  // The _id is now explicitly a string
            crafted_items: subspecialismValue.crafted_items,
            max_points: subspecialismValue.max_points
          };
  
          // Log the document before inserting or updating
          console.log(`Processing document for ${specialismName} - ${subspecialismName}:`, document);
  
          // Insert or update the document in the collection
          const exists = await collection.findOne({ _id });
  
          if (!exists) {
            try {
                const insertResult = await collection.insertOne(document);
                console.log(`✅ Inserted: ${specialismName} - ${subspecialismName}`, insertResult);
                totalInserted++;
              } catch (error) {
                console.error(`❌ Error inserting document for ${specialismName} - ${subspecialismName}:`, error);
              }
          } else {
            try {
                const updateResult = await collection.updateOne(
                  { _id },
                  { $set: { crafted_items: subspecialismValue.crafted_items, max_points: subspecialismValue.max_points } }
                );
                console.log(`♻️ Updated: ${specialismName} - ${subspecialismName}`, updateResult);
                totalUpdated++;
              } catch (error) {
                console.error(`❌ Error updating document for ${specialismName} - ${subspecialismName}:`, error);
              }
          }
        }
      }
  
      console.log(`✅ Specialism collection initialized! Inserted: ${totalInserted}, Updated: ${totalUpdated}`);
      return { total: totalInserted+totalUpdated };
    } catch (error: any) {
      console.error("❌ Error initializing specialism collection:", error.message);
      throw new Error("Failed to initialize specialism collection.");
    }
  }