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
const PROJECTS_TABLE = process.env.PROJECTS_TABLE || "Projects";

console.log(`Using region: ${REGION}, table: ${PROJECTS_TABLE}`);

const ddb = new DynamoDBClient({ region: REGION });

console.log("DynamoDB client created.");

// --- Extract S3 key from full URL ---
function extractKeyFromUrl(url) {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.replace(/^\/+/, ""));
  } catch {
    return url; // if it's already a key, return as-is
  }
}

async function migrateProjectThumbnails() {
  console.log(`🚀 Starting migration of project thumbnails to keys in table: ${PROJECTS_TABLE}`);
  console.log(`🌍 Region: ${REGION}`);
  console.log("");

  let ExclusiveStartKey;
  let migratedCount = 0;

  do {
    const scanRes = await ddb.send(
      new ScanCommand({
        TableName: PROJECTS_TABLE,
        ExclusiveStartKey,
      })
    );

    for (const item of scanRes.Items || []) {
      const projectId = item.projectId?.S;
      if (!projectId) continue;

      let updated = false;

      // --- Thumbnails ---
      let newThumbnails = [];
      if (item.thumbnails?.L) {
        newThumbnails = item.thumbnails.L.map((t) => {
          const original = t.S;
          const extracted = extractKeyFromUrl(original);
          if (extracted !== original) {
            updated = true;
            console.log(`Converting thumbnail: ${original} -> ${extracted}`);
          }
          return { S: extracted };
        });
      }

      if (updated) {
        console.log(`🔄 Updating projectId=${projectId}`);
        await ddb.send(
          new UpdateItemCommand({
            TableName: PROJECTS_TABLE,
            Key: { projectId: item.projectId },
            UpdateExpression: "SET thumbnails = :thumbs",
            ExpressionAttributeValues: {
              ":thumbs": { L: newThumbnails },
            },
          })
        );
        migratedCount++;
      }
    }

    ExclusiveStartKey = scanRes.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log(`✅ Migration complete! Migrated ${migratedCount} projects.`);
}

migrateProjectThumbnails().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});