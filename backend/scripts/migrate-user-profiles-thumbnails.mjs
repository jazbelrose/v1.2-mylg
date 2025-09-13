#!/usr/bin/env node
import { config } from "dotenv";
import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

config();

console.log("Environment loaded, starting script...");

const REGION = process.env.AWS_REGION || "us-west-2";
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || "UserProfiles";

console.log(`Using region: ${REGION}, table: ${USER_PROFILES_TABLE}`);

const ddb = new DynamoDBClient({ region: REGION });

console.log("DynamoDB client created.");

// --- Extract S3 key from full URL ---
function extractKeyFromUrl(url) {
  try {
    const u = new URL(url);
    // Drop bucket + domain, strip query string → return path without leading "/"
    return decodeURIComponent(u.pathname.replace(/^\/+/, ""));
  } catch {
    return url; // if it's already a key, return as-is
  }
}

async function migrateUserProfiles() {
  console.log(`🚀 Starting migration of thumbnails in table: ${USER_PROFILES_TABLE}`);
  console.log(`🌍 Region: ${REGION}`);
  console.log("");

  let ExclusiveStartKey;
  let migratedCount = 0;

  do {
    const scanRes = await ddb.send(
      new ScanCommand({
        TableName: USER_PROFILES_TABLE,
        ExclusiveStartKey,
      })
    );

    for (const item of scanRes.Items || []) {
      const userId = item.userId?.S;
      if (!userId) continue;

      if (item.thumbnail?.S) {
        const oldVal = item.thumbnail.S;
        const newVal = extractKeyFromUrl(oldVal);

        if (newVal !== oldVal) {
          console.log(`🔄 Updating userId=${userId}`);
          await ddb.send(
            new UpdateItemCommand({
              TableName: USER_PROFILES_TABLE,
              Key: { userId: item.userId },
              UpdateExpression: "SET thumbnail = :thumb",
              ExpressionAttributeValues: {
                ":thumb": { S: newVal },
              },
            })
          );
          migratedCount++;
        }
      }
    }

    ExclusiveStartKey = scanRes.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log(`✅ Migration complete! Migrated ${migratedCount} user profiles.`);
}

migrateUserProfiles().catch((err) => {
  console.error("💥 Migration failed", err);
  process.exit(1);
});