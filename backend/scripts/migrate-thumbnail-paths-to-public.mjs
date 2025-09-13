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

async function migrateThumbnailPaths() {
  console.log(`🚀 Starting migration of thumbnail paths to include 'public/' prefix in table: ${PROJECTS_TABLE}`);
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
          let updatedKey = original;
          if (original.startsWith('project-thumbnails/') && !original.startsWith('public/project-thumbnails/')) {
            updatedKey = `public/${original}`;
            updated = true;
            console.log(`Converting thumbnail: ${original} -> ${updatedKey}`);
          }
          return { S: updatedKey };
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

migrateThumbnailPaths().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});