import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REGION = process.env.AWS_REGION || 'us-west-2';
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || 'UserProfiles';
const USER_DIRECTORY_TABLE = process.env.USER_DIRECTORY_TABLE || 'UserDirectory';

async function migrateUserProfilesToDirectory() {
  console.log('🚀 Starting batch migration from UserProfiles to UserDirectory');
  console.log(`📍 Region: ${REGION}`);
  console.log(`📊 Source Table: ${USER_PROFILES_TABLE}`);
  console.log(`🎯 Target Table: ${USER_DIRECTORY_TABLE}`);
  console.log('---');

  try {
    let lastEvaluatedKey;
    let usersMap = {};
    let totalProcessed = 0;
    const startTime = Date.now();

    // First, collect all user profiles
    console.log('🔍 Collecting all user profiles from source table...');

    do {
      const scanParams = {
        TableName: USER_PROFILES_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 25
      };

      const scanResult = await ddb.send(new ScanCommand(scanParams));

      if (!scanResult.Items || scanResult.Items.length === 0) {
        console.log('✋ No more items to process');
        break;
      }

      // Process each item and add to users map
      for (const item of scanResult.Items) {
        totalProcessed++;

        const userData = {
          brandAddress: item.brandAddress,
          brandLogoUrl: item.brandLogoUrl,
          brandName: item.brandName,
          brandPhone: item.brandPhone,
          brandTagline: item.brandTagline,
          collaborators: item.collaborators,
          company: item.company,
          email: item.email,
          firstName: item.firstName,
          lastName: item.lastName,
          occupation: item.occupation,
          pending: item.pending,
          phoneNumber: item.phoneNumber,
          role: item.role,
          thumbnail: item.thumbnail,
        };

        // Clean undefined values
        const cleanUserData = Object.fromEntries(
          Object.entries(userData).filter(([_, value]) => value !== undefined)
        );

        // Use userId as the key in the users map
        usersMap[item.userId] = cleanUserData;
      }

      console.log(`📦 Collected ${scanResult.Items.length} user profiles (total: ${totalProcessed})`);

      lastEvaluatedKey = scanResult.LastEvaluatedKey;

    } while (lastEvaluatedKey);

    console.log(`\n📊 Collected ${Object.keys(usersMap).length} user profiles total`);
    console.log('💾 Creating directory item...');

    // Create the directory item with users as a map
    const directoryItem = {
      directoryId: "1",  // Single directory item
      users: usersMap,
      lastUpdated: new Date().toISOString(),
      totalUsers: Object.keys(usersMap).length
    };

    // Clean undefined values from directory item
    const cleanDirectoryItem = Object.fromEntries(
      Object.entries(directoryItem).filter(([_, value]) => value !== undefined)
    );

    const putParams = {
      TableName: USER_DIRECTORY_TABLE,
      Item: cleanDirectoryItem,
    };

    await ddb.send(new PutCommand(putParams));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n🎉 Migration completed!');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Total user profiles processed: ${totalProcessed}`);
    console.log(`📁 Directory item created with ${Object.keys(usersMap).length} users`);
    console.log(`💾 Single item stored in ${USER_DIRECTORY_TABLE}`);

    console.log('\n🎊 Migration successful!');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUserProfilesToDirectory();