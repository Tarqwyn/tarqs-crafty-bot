import * as unicodedata from "unorm";
import AWS from "aws-sdk";

export function getSecretsManagerClient(): AWS.SecretsManager {
  const isLocal = process.env.NODE_ENV === "local";

  return new AWS.SecretsManager({
    region: process.env.AWS_REGION || "eu-west-1",
    ...(isLocal && {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
      sessionToken: process.env.AWS_SESSION_TOKEN || "test",
      endpoint:
        process.env.AWS_SECRETS_MANAGER_ENDPOINT ||
        "http://secrets-manager:5000",
    }),
  });
}

export function cleanCharacterName(name: string): string {
  return unicodedata.nfkd(name).replace(/[^A-Za-z0-9-_+=.@!]/g, "");
}
