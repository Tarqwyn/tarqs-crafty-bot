import { APIGatewayEvent } from "aws-lambda";
import { fetchCharacterFromDB, fetchCraftersForRecipe } from "./api-handlers";
import { cleanCharacterName } from "../services/utils";

export async function handleApiGateway(event: APIGatewayEvent) {
  const pathParams = event.pathParameters || {};
  const characterName = pathParams.name;
  const realm = pathParams.realm;

  if (pathParams.recipe) {
    const recipeName = decodeURIComponent(pathParams.recipe);
    console.log(`🔍 Looking up who can craft "${recipeName}"...`);

    const crafters = await fetchCraftersForRecipe(recipeName);

    if (!crafters) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No crafters found for this recipe." }),
      };
    }

    console.log(`✅ Found crafters.`);
    return {
      statusCode: 200,
      body: JSON.stringify({ recipe: recipeName, crafters }, null, 2),
      headers: { "Content-Type": "application/json" },
    };
  }

  if (!characterName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing character name" }),
    };
  }

  const cleanedCharacter = cleanCharacterName(characterName.toLowerCase());

  if (realm) {
    const cleanedRealm = realm.toLowerCase();
    console.log(
      `🔍 Fetching professions for ${cleanedCharacter}#${cleanedRealm}...`,
    );
    const characterData = await fetchCharacterFromDB(
      cleanedCharacter,
      cleanedRealm,
    );

    if (!characterData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Character not found" }),
      };
    }

    console.log(
      `✅ Returning API response:\n`,
      JSON.stringify(characterData, null, 2),
    );
    return {
      statusCode: 200,
      body: JSON.stringify(characterData[0], null, 2),
      headers: { "Content-Type": "application/json" },
    };
  } else {
    console.log(
      `🔍 Searching for character: "${cleanedCharacter}" across all realms...`,
    );
    const matches = await fetchCharacterFromDB(cleanedCharacter);

    if (!matches || matches.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Character not found on any known realm",
        }),
      };
    }

    if (Array.isArray(matches) && matches.length > 1) {
      console.log(
        `✅ Multiple matches found for ${cleanedCharacter}:`,
        matches,
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Multiple matches found",
          characters: matches.map((char) => ({
            name: char.character_name,
            realm: char.realm,
            level: char.level,
          })),
        }),
        headers: { "Content-Type": "application/json" },
      };
    }

    console.log(`✅ Unique match found for ${cleanedCharacter}:`, matches[0]);
    return {
      statusCode: 200,
      body: JSON.stringify(matches[0], null, 2),
      headers: { "Content-Type": "application/json" },
    };
  }
}
