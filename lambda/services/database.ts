import { MongoClient } from "mongodb";
import * as AWS from "aws-sdk";

const secretsManager = new AWS.SecretsManager();
const SECRET_ARN = process.env.DOCUMENTDB_SECRET_ARN || "";

let cachedClient: MongoClient | null = null;
let cachedSecrets: any = null;

export async function getMongoClient(): Promise<MongoClient> {
    if (cachedClient) {
        console.log("✅ Using cached MongoDB connection");
        return cachedClient;
    }

    if (!cachedSecrets) {
        console.log("🔍 Fetching credentials from Secrets Manager...");
        const secretData = await secretsManager.getSecretValue({ SecretId: SECRET_ARN }).promise();
        cachedSecrets = JSON.parse(secretData.SecretString || "{}");
        console.log("✅ Cached Secrets Manager response.");
    }

    if (!SECRET_ARN) {
        throw new Error("❌ Missing Secrets Manager ARN. Ensure DOCUMENTDB_SECRET_ARN is set.");
    }
    
    try {
        const uri = `mongodb://${cachedSecrets.host}:27017/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred`;
        const username = cachedSecrets.username;
        const password = cachedSecrets.password;

        console.log("🔌 Connecting to DocumentDB using Secrets Manager...");
        cachedClient = new MongoClient(uri, {
            tls: true,
            tlsAllowInvalidCertificates: true,
            auth: { username, password },
            retryWrites: false, 
        });

        await cachedClient.connect();
        console.log("✅ Successfully connected to DocumentDB!");

        return cachedClient;
    } catch (error: unknown) {
        console.error("❌ Failed to connect to DocumentDB:", (error instanceof Error) ? error.message : error);
        throw new Error("❌ DocumentDB connection failed");
    }
}
