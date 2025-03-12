import { MongoClient } from "mongodb";
import { getSecretsManagerClient } from "./utils";
import { MongoDBSecrets } from "../types/types";

const secretsManager = getSecretsManagerClient();

const SECRET_ARN = process.env.DOCUMENTDB_SECRET_ARN || "";
const DB_SSL = process.env.DB_SSL === "false" ? false : true;

let cachedClient: MongoClient | null = null;
let cachedSecrets: MongoDBSecrets | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    try {
      // 🛠️ Validate existing connection
      await cachedClient.db().admin().ping();
      console.log("✅ Cached MongoDB connection is still valid.");
      return cachedClient;
    } catch (error) {
      console.warn("⚠️ Cached connection is stale. Reconnecting...", error);
      cachedClient = null; // Reset cached client
    }
  }

  if (!cachedSecrets) {
    console.log("🔍 Fetching credentials from Secrets Manager...");
    const secretData = await secretsManager
      .getSecretValue({ SecretId: SECRET_ARN })
      .promise();
    cachedSecrets = JSON.parse(secretData.SecretString || "{}");
    console.log("✅ Cached Secrets Manager response.");
  }

  if (!SECRET_ARN) {
    throw new Error(
      "❌ Missing Secrets Manager ARN. Ensure DOCUMENTDB_SECRET_ARN is set.",
    );
  }

  try {
    let uri;
    if (process.env.NODE_ENV === "local") {
      // Local MongoDB without replica set
      uri = `mongodb://${cachedSecrets!.host}:27017/`;
    } else {
      // AWS DocumentDB with replica set
      uri = `mongodb://${cachedSecrets!.host}:27017/?replicaSet=rs0&readPreference=secondaryPreferred`;
    }
    const username = cachedSecrets!.username;
    const password = cachedSecrets!.password;

    console.log("🔌 Connecting to DocumentDB using Secrets Manager...");
    cachedClient = new MongoClient(uri, {
      tls: DB_SSL,
      tlsAllowInvalidCertificates: DB_SSL,
      auth: { username, password },
      retryWrites: false,
    });

    await cachedClient.connect();
    console.log("✅ Successfully connected to DocumentDB!");

    return cachedClient;
  } catch (error: unknown) {
    console.error(
      "❌ Failed to connect to DocumentDB:",
      error instanceof Error ? error.message : error,
    );
    throw new Error("❌ DocumentDB connection failed");
  }
}
