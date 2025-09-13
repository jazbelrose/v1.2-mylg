#!/usr/bin/env node
import { S3Client, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";

// Load environment variables
config();

// Allow overriding bucket names/regions via environment variables
const BUCKET = process.env.BUCKET || "mylg-files-v12";
const REGION = process.env.REGION || "us-west-2";

// Simple content type mapping based on file extension
const getContentType = (key) => {
  const ext = key.toLowerCase().split('.').pop();
  const mappings = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf'
  };
  return mappings[ext] || 'application/octet-stream';
};

async function fixContentTypes() {
  const s3Client = new S3Client({ region: REGION });

  console.log(`🔧 Fixing content types for bucket: ${BUCKET} in region: ${REGION}`);
  console.log("");

  let continuationToken;
  let totalProcessed = 0;
  let totalUpdated = 0;

  do {
    // List objects
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuationToken,
      MaxKeys: 1000 // Process in batches
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    console.log(`📋 Processing ${objects.length} objects...`);

    for (const obj of objects) {
      const key = obj.Key;
      const currentContentType = obj.ContentType || 'unknown';
      const correctContentType = getContentType(key);

      totalProcessed++;

      if (currentContentType !== correctContentType) {
        try {
          // Copy object to itself with correct content type
          const copyCommand = new CopyObjectCommand({
            Bucket: BUCKET,
            Key: key,
            CopySource: `${BUCKET}/${key}`,
            ContentType: correctContentType,
            MetadataDirective: 'REPLACE'
          });

          await s3Client.send(copyCommand);
          console.log(`✅ Updated ${key}: ${currentContentType} -> ${correctContentType}`);
          totalUpdated++;
        } catch (error) {
          console.error(`❌ Failed to update ${key}:`, error.message);
        }
      } else {
        console.log(`⏭️  Skipped ${key}: already correct (${currentContentType})`);
      }
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  console.log("");
  console.log("🎉 Content type fix completed!");
  console.log(`📊 Total objects processed: ${totalProcessed}`);
  console.log(`🔄 Total objects updated: ${totalUpdated}`);
}

// Run the fix
fixContentTypes().catch(console.error);