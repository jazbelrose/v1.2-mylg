#!/usr/bin/env node
import { config } from "dotenv";
import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

// Load environment variables
config();

const REGION = process.env.AWS_REGION || "us-west-2";
const MESSAGES_TABLE = process.env.MESSAGES_TABLE || "Messages";
const PROJECT_MESSAGES_TABLE = process.env.PROJECT_MESSAGES_TABLE || "ProjectMessages";

const ddb = new DynamoDBClient({ region: REGION });

// Helper: check if text is only a URL
function isOnlyUrl(text) {
  return /^https:\/\/.*s3.*\.amazonaws\.com/.test(text.trim());
}

// Helper: remove S3 URL from text
function removeS3Url(text) {
  return text.replace(/https:\/\/.*s3.*\.amazonaws\.com\S+/g, "").trim();
}

// Helper: extract S3 key from old URL
function extractKey(url) {
  try {
    const u = new URL(url);
    // Drop bucket + domain → return path without leading "/"
    return decodeURIComponent(u.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

// Helper: get the correct key for the table
function getKey(item, tableName) {
  if (tableName === PROJECT_MESSAGES_TABLE) {
    return {
      projectId: item.projectId,
      messageId: item.messageId
    };
  }
  return {
    conversationId: item.conversationId,
    messageId: item.messageId
  };
}

async function migrate(tableName) {
  console.log(`🚀 Starting migration of old messages with S3 URLs for table: ${tableName}...`);
  console.log(`🌍 Region: ${REGION}`);
  console.log("");

  let ExclusiveStartKey;
  let migratedCount = 0;

  do {
    const scanRes = await ddb.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey
      })
    );

    for (const item of scanRes.Items || []) {
      const text = item.text?.S;
      if (text && text.includes("s3.")) {
        const key = extractKey(text);
        if (!key) {
          console.warn(`⚠️ Could not extract key from text: ${text}`);
          continue;
        }

        const newText = isOnlyUrl(text) ? "" : removeS3Url(text);

        console.log(`🔄 Migrating messageId=${item.messageId.S} → key=${key}, newText="${newText}"`);

        await ddb.send(
          new UpdateItemCommand({
            TableName: tableName,
            Key: getKey(item, tableName),
            UpdateExpression:
              "SET #text = :newText, attachments = :attachments",
            ExpressionAttributeNames: {
              "#text": "text"
            },
            ExpressionAttributeValues: {
              ":newText": { S: newText },
              ":attachments": {
                L: [
                  {
                    M: {
                      key: { S: key },
                      name: { S: key.split("/").pop() || "file" },
                      type: { S: guessMimeType(key) }
                    }
                  }
                ]
              }
            }
          })
        );

        migratedCount++;
      }
    }

    ExclusiveStartKey = scanRes.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log(`✅ Migration complete for ${tableName}! Migrated ${migratedCount} messages.`);
}

// Crude MIME type helper
function guessMimeType(key) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

async function runMigrations() {
  await migrate(MESSAGES_TABLE);
  await migrate(PROJECT_MESSAGES_TABLE);
}

runMigrations().catch((err) => {
  console.error("💥 Migration failed", err);
  process.exit(1);
});