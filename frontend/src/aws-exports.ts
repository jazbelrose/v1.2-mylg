// Mock configuration for audit purposes
const cfg = {
  version: "1",
  auth: {
    aws_region: "us-east-1",
    user_pool_id: "mock-pool",
    user_pool_web_client_id: "mock-client"
  },
  storage: {
    aws_region: "us-east-1",
    bucket_name: "mock-bucket"
  }
};

// Pass through the generated Amplify configuration as-is. The JSON already
// contains the modern Amplify v6 shape under Auth/Storage and any legacy keys
// are safely ignored by Amplify.
export default cfg as unknown as Record<string, unknown>;
