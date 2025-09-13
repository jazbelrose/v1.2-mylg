#!/usr/bin/env node
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-west-2'
});

const docClient = DynamoDBDocumentClient.from(client);

// Fields to remove from Projects table
const FIELDS_TO_REMOVE = [
  'invoices',
  'logo',
  'subtitle',
  'tags',
  'uploads',
  'visibility',
  'budget',
  'chat_uploads',
  'downloads',
  'drawings',
  'florrplans', // Note: likely a typo for 'floorplans'
  'galleries',
  'galleryUpdate',
  'images'
];

async function migrateProjects() {
  console.log('🚀 Starting Projects table field removal migration');
  console.log(`📍 Region: ${process.env.AWS_REGION || 'us-west-2'}`);
  console.log(`🎯 Table: Projects`);
  console.log(`🗑️  Fields to remove: ${FIELDS_TO_REMOVE.join(', ')}`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let lastEvaluatedKey = null;

  do {
    // Scan projects in batches
    const scanParams = {
      TableName: 'Projects',
      ExclusiveStartKey: lastEvaluatedKey,
      ProjectionExpression: 'projectId',
      FilterExpression: 'attribute_exists(#pid)',
      ExpressionAttributeNames: {
        '#pid': 'projectId'
      }
    };

    try {
      const scanResult = await docClient.send(new ScanCommand(scanParams));
      const items = scanResult.Items || [];

      console.log(`📊 Processing batch of ${items.length} projects...`);

      // Process each project
      for (const item of items) {
        const projectId = item.projectId;
        let needsUpdate = false;
        const updateExpressionParts = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        // Check which fields exist and need to be removed
        for (let i = 0; i < FIELDS_TO_REMOVE.length; i++) {
          const field = FIELDS_TO_REMOVE[i];
          updateExpressionParts.push(`REMOVE #field${i}`);
          expressionAttributeNames[`#field${i}`] = field;
        }

        if (updateExpressionParts.length > 0) {
          needsUpdate = true;
        }

        if (needsUpdate) {
          const updateParams = {
            TableName: 'Projects',
            Key: { projectId },
            UpdateExpression: updateExpressionParts.join(' '),
            ExpressionAttributeNames: expressionAttributeNames,
            ReturnValues: 'NONE'
          };

          try {
            await docClient.send(new UpdateCommand(updateParams));
            totalUpdated++;
            console.log(`✅ Updated project: ${projectId}`);
          } catch (updateError) {
            console.error(`❌ Failed to update project ${projectId}:`, updateError.message);
          }
        }

        totalProcessed++;
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;

      if (lastEvaluatedKey) {
        console.log(`🔄 Continuing with next batch...`);
      }

    } catch (scanError) {
      console.error('❌ Scan error:', scanError.message);
      break;
    }

  } while (lastEvaluatedKey);

  console.log(`\n🎉 Migration completed!`);
  console.log(`📊 Total projects processed: ${totalProcessed}`);
  console.log(`✅ Total projects updated: ${totalUpdated}`);
}

// Run the migration
migrateProjects().catch(console.error);