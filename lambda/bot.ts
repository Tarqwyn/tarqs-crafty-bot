import { APIGatewayEvent } from "aws-lambda";
import { getBlizzardToken } from "./services/blizzard-api";
import { updateGuildMembers } from "./handlers/update-handler";
import {
  initItemCollection,
  initSpecialismCollection,
} from "./handlers/item-collection-handler";
import ensureIndexes from "./scripts/ensureIndexes";
import { handleApiGateway } from "./handlers/api-gateway";

const actions = {
  updateGuild: async () => {
    const accessToken = await getBlizzardToken();
    console.log("🔄 Updating Database with Guild Members crafting data...");
    await updateGuildMembers("the-asylum", "quelthalas", accessToken);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Guild members updated!" }),
    };
  },
  initItemCollection: async () => {
    console.log("🔄 Initializing item collection...");
    const collection = await initItemCollection();
    const specialism = await initSpecialismCollection();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Item & Specialism collections initialized!",
        totalRecipes: collection.total,
        specialisms: specialism.total,
      }),
    };
  },
  ensureIndexes: async () => {
    console.log("📌 Ensuring indexes exist...");
    await ensureIndexes();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Indexes ensured!" }),
    };
  },
} as const;

type ActionType = keyof typeof actions;

interface CustomLambdaEvent {
  action?: ActionType;
}

type LambdaEvent = APIGatewayEvent | CustomLambdaEvent;

function isApiGatewayEvent(event: LambdaEvent): event is APIGatewayEvent {
  return "requestContext" in event && "httpMethod" in event;
}

export async function lambdaHandler(event: LambdaEvent) {
  console.log("🚀 Lambda execution started!!!");

  if (isApiGatewayEvent(event)) {
    return handleApiGateway(event);
  }

  if (event.action && event.action in actions) {
    try {
      return await actions[event.action]();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(
          `❌ Error in Lambda execution (${event.action}):`,
          error.message,
        );
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Failed to process ${event.action}` }),
        };
      } else {
        console.error(
          `❌ Unknown error in Lambda execution (${event.action}):`,
          error,
        );
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "An unknown error occurred" }),
        };
      }
    }
  }

  console.warn("⚠️ Invalid request received:", event);
  return {
    statusCode: 400,
    body: JSON.stringify({ error: "Invalid request" }),
  };
}
