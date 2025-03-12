import { getMongoClient } from "../services/database";
import { Collection, IndexSpecification, MongoClient } from "mongodb";

async function indexExists(
  collection: Collection,
  field: IndexSpecification,
): Promise<boolean> {
  const indexes = await collection.listIndexes().toArray();
  return indexes.some(
    (idx) => JSON.stringify(idx.key) === JSON.stringify(field),
  );
}

export default async function ensureIndexes() {
  const client: MongoClient = await getMongoClient();
  const db = client.db("CraftingBotDB");

  console.log("📌 Checking and ensuring indexes...");

  const guildMembers = db.collection("guild_members");
  const craftableItems = db.collection("craftable_items");
  const specialism = db.collection("Specialism");

  // Explicitly type each index to avoid undefined properties
  const indexes: {
    collection: Collection;
    field: IndexSpecification;
    name: string;
  }[] = [
    {
      collection: guildMembers,
      field: { character_name: 1 },
      name: "character_name_idx",
    },
    {
      collection: guildMembers,
      field: { "khaz_algar_professions.recipes": 1 },
      name: "recipes_idx",
    },
    { collection: craftableItems, field: { name: 1 }, name: "item_name_idx" },
    {
      collection: specialism,
      field: { "crafted_items.items": 1 },
      name: "crafted_items_idx",
    },
  ];

  for (const { collection, field, name } of indexes) {
    const exists = await indexExists(collection, field);
    if (exists) {
      console.log(
        `✅ Index on ${JSON.stringify(field)} already exists. Skipping.`,
      );
    } else {
      console.log(`📌 Creating index "${name}"...`);
      await collection.createIndex(field, { name });
      console.log(`✅ Index "${name}" created.`);
    }
  }

  console.log("🚀 All necessary indexes are ensured.");
  await client.close();
}
