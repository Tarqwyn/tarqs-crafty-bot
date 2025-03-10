import { getMongoClient } from "../services/database";
import {
  fetchGuildRoster,
  fetchCharacterProfessions,
} from "../services/blizzard-api";
import { cleanCharacterName } from "../services/utils";
import { Collection, AnyBulkWriteOperation } from "mongodb";
import { GuildMemberDocument } from "../types/types";

const GUILD_COLLECTION = "guild_members";

async function cleanupOldGuildMembers(
  collection: Collection<GuildMemberDocument>,
  currentMembersSet: Set<string>,
) {
  console.log("🗑️ Checking for old members to remove...");

  const storedMembers = await collection
    .find<{
      character_realm: string;
    }>({}, { projection: { character_realm: 1 } })
    .toArray();

  console.log(`📦 Found ${storedMembers.length} stored members in database.`);

  const membersToDelete: string[] = storedMembers
    .map((member) => member.character_realm as string)
    .filter((characterKey) => !currentMembersSet.has(characterKey));

  if (membersToDelete.length === 0) {
    console.log("✅ No outdated members found. Database is up to date!");
    return;
  }

  console.log(
    `🗑️ Removing ${membersToDelete.length} old members from database...`,
  );
  await collection.deleteMany({ character_realm: { $in: membersToDelete } });
  console.log("✅ Cleanup complete! Old members removed.");
}

export async function updateGuildMembers(
  guildName: string,
  realm: string,
  accessToken: string,
) {
  const client = await getMongoClient();
  const db = client.db("CraftingBotDB");
  const collection = db.collection<GuildMemberDocument>(GUILD_COLLECTION);
  const roster = await fetchGuildRoster(accessToken, guildName, realm);

  if (!roster || !roster.members) {
    console.error("❌ Failed to fetch guild roster or empty response.");
    return;
  }

  console.log(
    `✅ Retrieved ${roster.members.length} guild members. Syncing to DocumentDB...`,
  );
  const currentMembersSet: Set<string> = new Set();
  const bulkUpdateOps: AnyBulkWriteOperation<GuildMemberDocument>[] = [];

  for (const member of roster.members) {
    try {
      const charName = cleanCharacterName(member.character.name).toLowerCase();
      const charRealm = member.character.realm.slug;

      console.log(`🔍 Fetching professions for ${charName} (${charRealm})...`);
      const professions = await fetchCharacterProfessions(
        accessToken,
        charName,
        charRealm,
      );

      const characterKey = `${charName}#${charRealm}`;
      currentMembersSet.add(characterKey);

      console.log(`📝 Updating: ${characterKey}`);

      bulkUpdateOps.push({
        updateOne: {
          filter: { character_realm: characterKey },
          update: {
            $set: {
              character_name: charName,
              realm: charRealm,
              level: member.character.level || 0,
              khaz_algar_professions: professions || [],
            },
          },
          upsert: true,
        },
      });
    } catch (error) {
      console.error(`❌ Error processing character: ${error}`);
    }
  }

  if (bulkUpdateOps.length > 0) {
    console.log(
      `⚡ Performing bulk update for ${bulkUpdateOps.length} members...`,
    );
    await collection.bulkWrite(bulkUpdateOps);
  } else {
    console.log("⚠️ No members to update.");
  }
  await cleanupOldGuildMembers(collection, currentMembersSet);
}
