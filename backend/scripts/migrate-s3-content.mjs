#!/usr/bin/env node
import { execSync } from 'child_process';
import { config } from "dotenv";

// Load environment variables
config();

const OLD_BUCKET = "mylguserdata194416-dev";
const NEW_BUCKET = "mylg-files-v12";
const OLD_REGION = "us-west-1";
const NEW_REGION = "us-west-2";

async function migrateS3Content() {
  console.log("🚀 Starting S3 content migration using AWS CLI...");
  console.log(`📦 From: ${OLD_BUCKET} (${OLD_REGION})`);
  console.log(`📦 To: ${NEW_BUCKET} (${NEW_REGION})`);
  console.log("");

  try {
    // Use AWS CLI to sync buckets
    console.log("📋 Syncing buckets using AWS CLI...");

    const syncCommand = `aws s3 sync s3://${OLD_BUCKET} s3://${NEW_BUCKET} --source-region ${OLD_REGION} --region ${NEW_REGION} --acl public-read`;

    console.log(`Running: ${syncCommand}`);

    const result = execSync(syncCommand, {
      encoding: 'utf8',
      stdio: 'inherit'
    });

    console.log("✅ Migration completed successfully!");
    console.log("Result:", result);

  } catch (error) {
    console.error("💥 Migration failed:", error.message);
    console.log("\n💡 Alternative approach: You can also use the AWS Console to copy objects manually:");
    console.log(`1. Go to S3 Console: https://s3.console.aws.amazon.com/s3/buckets/${OLD_BUCKET}`);
    console.log(`2. Select all objects and choose "Copy"`);
    console.log(`3. Paste to destination: s3://${NEW_BUCKET}`);
    process.exit(1);
  }
}

// Run the migration
migrateS3Content().catch(console.error);