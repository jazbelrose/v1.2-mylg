import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true });
const apigw = new AWS.ApiGatewayManagementApi({
  endpoint: (process.env.WEBSOCKET_ENDPOINT || "").trim(),
});

async function broadcastPresence(userId, online, excludeConnectionId) {
  if (!process.env.CONNECTIONS_TABLE) return;
  const payload = {
    action: "presenceChanged",
    userId,
    online,
    at: new Date().toISOString(),
  };

  let lastKey;
  do {
    const r = await dynamoDb
      .scan({
        TableName: process.env.CONNECTIONS_TABLE,
        ProjectionExpression: "connectionId",
        ExclusiveStartKey: lastKey,
      })
      .promise();

    const ids = (r.Items || [])
      .map((i) => i.connectionId)
      .filter((id) => id && id !== excludeConnectionId);

    // 🔎 add this log here
    console.log("📣 Broadcasting presence", payload, "to", ids.length, "connections:", ids);

    await Promise.allSettled(
      ids.map((id) =>
        apigw
          .postToConnection({ ConnectionId: id, Data: JSON.stringify(payload) })
          .promise()
          .catch(async (e) => {
            if (e && e.statusCode === 410) {
              console.warn("💀 Stale connection", id, "removing...");
              try {
                await dynamoDb
                  .delete({
                    TableName: process.env.CONNECTIONS_TABLE,
                    Key: { connectionId: id },
                  })
                  .promise();
              } catch {}
            } else {
              console.error("postToConnection error", { id, msg: e && e.message });
            }
          })
      )
    );
    lastKey = r.LastEvaluatedKey;
  } while (lastKey);
}

async function sendPresenceSnapshot(connectionId) {
  if (!process.env.CONNECTIONS_TABLE) return;
  try {
    const r = await dynamoDb
      .scan({
        TableName: process.env.CONNECTIONS_TABLE,
        ProjectionExpression: "userId",
      })
      .promise();

    const users = Array.from(new Set((r.Items || []).map((i) => i.userId).filter(Boolean)));
    const payload = {
      action: "presenceSnapshot",
      userIds: users,
      at: new Date().toISOString(),
    };

    // 🔎 add this log here
    console.log("📤 Sending snapshot to", connectionId, "with users:", users);

    await apigw
      .postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(payload),
      })
      .promise();
  } catch (e) {
    console.error("sendPresenceSnapshot error", { connectionId, msg: e && e.message });
  }
}


export const handler = async (event) => {
console.log("🚀 onConnect triggered");

  const connectionId = event?.requestContext?.connectionId;
  const auth = event?.requestContext?.authorizer || {};
  const userId = auth.userId;

  // Normalize headers to lowercase
  const H = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
  );
  const MV = Object.fromEntries(
    Object.entries(event.multiValueHeaders || {}).map(([k, v]) => [
      k.toLowerCase(),
      v,
    ])
  );

  // Browser sent: "token, sessionId"
  const rawProto =
    H["sec-websocket-protocol"] ||
    (Array.isArray(MV["sec-websocket-protocol"])
      ? MV["sec-websocket-protocol"][0]
      : "") ||
    "";

  const parts = rawProto
    .split(",")
    .map((s) => s && s.trim())
    .filter(Boolean);
  const token = parts[0] || ""; // first subprotocol offered
  const sessionId = parts[1] || ""; // second subprotocol offered
  const selected = token || undefined; // echo EXACTLY ONE back

  const safeLog = {
    connectionId,
    userId,
    role: auth.role,
    stage: event?.requestContext?.stage,
    sourceIp: event?.requestContext?.identity?.sourceIp,
    userAgent: event?.requestContext?.identity?.userAgent,
    sessionId,
  };
  console.log("� New WebSocket Connection (safe):", JSON.stringify(safeLog));

  if (!userId) {
    console.error("🚫 Unauthorized connection attempt.");
    return { statusCode: 403, body: "Unauthorized" };
  }

  try {
    // 1) OPTIONAL: prune only duplicates for the same (userId, sessionId)
    if (sessionId) {
      const dup = await dynamoDb
        .query({
          TableName: process.env.CONNECTIONS_TABLE,
          IndexName: "userId-sessionId-index",
          KeyConditionExpression: "userId = :u AND sessionId = :s",
          ExpressionAttributeValues: { ":u": userId, ":s": sessionId },
        })
        .promise();

      if (dup.Items?.length) {
        await Promise.all(
          dup.Items.map((conn) =>
            dynamoDb
              .delete({
                TableName: process.env.CONNECTIONS_TABLE,
                Key: { connectionId: conn.connectionId },
              })
              .promise()
          )
        );
      }
    }

    // 2) Save new connection (omit undefined fields)
    const item = {
      connectionId,
      userId,
      connectedAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };
    if (sessionId) item.sessionId = sessionId;

    await dynamoDb
      .put({
        TableName: process.env.CONNECTIONS_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(connectionId)", // only write if not present
      })
      .promise();

    console.log(
      `✅ Connection ${connectionId} saved for user ${userId} (session: ${
        sessionId || "none"
      })`
    );

    // Snapshot may 410 during $connect — harmless; keep it if you want best-effort
    await sendPresenceSnapshot(connectionId);

    // ⬅️ KEY FIX: Don’t broadcast to the brand-new connection
    await broadcastPresence(userId, true, connectionId);

    return {
      statusCode: 200,
      body: "Connected.",
      headers: selected ? { "Sec-WebSocket-Protocol": selected } : undefined,
    };
  } catch (err) {
    console.error("❌ Error in $connect:", err);
    return { statusCode: 500, body: "Failed to connect." };
  }
};
