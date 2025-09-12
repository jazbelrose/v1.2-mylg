import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REGION = process.env.AWS_REGION || 'us-west-2';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const PROJECTS_TABLE = process.env.PROJECTS_TABLE || 'Projects';
const DIRECTORY_TABLE = process.env.PROJECT_DIRECTORY_TABLE || 'ProjectDirectory';

async function migrateToProjectDirectory() {
  console.log('🚀 Starting batch migration from Projects to ProjectDirectory');
  console.log(`📍 Region: ${REGION}`);
  console.log(`📊 Source Table: ${PROJECTS_TABLE}`);
  console.log(`🎯 Target Table: ${DIRECTORY_TABLE}`);
  console.log('---');

  try {
    let lastEvaluatedKey;
    let projectsMap = {};
    let totalProcessed = 0;
    const startTime = Date.now();

    // First, collect all projects
    console.log('🔍 Collecting all projects from source table...');

    do {
      const scanParams = {
        TableName: PROJECTS_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 25
      };

      const scanResult = await ddb.send(new ScanCommand(scanParams));

      if (!scanResult.Items || scanResult.Items.length === 0) {
        console.log('✋ No more items to process');
        break;
      }

      // Process each item and add to projects map
      for (const item of scanResult.Items) {
        totalProcessed++;

        const projectData = {
          title: item.title,
          slug: item.slug,
          color: item.color,
          status: item.status,
          team: item.team,
          thumbnail: item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails[0] : null, // Flatten thumbnails to single thumbnail
          dateCreated: item.dateCreated,
          finishline: item.finishline,
          lastModified: item.lastModified,
        };

        // Clean undefined values
        const cleanProjectData = Object.fromEntries(
          Object.entries(projectData).filter(([_, value]) => value !== undefined)
        );

        // Use projectId as the key in the projects map
        projectsMap[item.projectId] = cleanProjectData;
      }

      console.log(`📦 Collected ${scanResult.Items.length} projects (total: ${totalProcessed})`);

      lastEvaluatedKey = scanResult.LastEvaluatedKey;

    } while (lastEvaluatedKey);

    console.log(`\n📊 Collected ${Object.keys(projectsMap).length} projects total`);
    console.log('💾 Creating directory item...');

    // Create the directory item with projects as a map
    const directoryItem = {
      directoryId: "1",  // Single directory item
      projects: projectsMap,
      lastUpdated: new Date().toISOString(),
      totalProjects: Object.keys(projectsMap).length
    };

    // Clean undefined values from directory item
    const cleanDirectoryItem = Object.fromEntries(
      Object.entries(directoryItem).filter(([_, value]) => value !== undefined)
    );

    const putParams = {
      TableName: DIRECTORY_TABLE,
      Item: cleanDirectoryItem,
    };

    await ddb.send(new PutCommand(putParams));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n🎉 Migration completed!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Total projects processed: ${totalProcessed}`);
    console.log(`📁 Directory item created with ${Object.keys(projectsMap).length} projects`);
    console.log(`💾 Single item stored in ${DIRECTORY_TABLE}`);

    console.log('\n🎊 Migration successful!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateToProjectDirectory();