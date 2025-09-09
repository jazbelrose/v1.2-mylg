/**
 * Lambda: WebSocketDefaultHandler
 * Route: WS $default
 * Auth: API Gateway WebSocket (connection-based)
 * Input: { action: string, ...payload }
 * Output: { ack: true } or error via WebSocket
 * Side effects: manages real-time messaging, notifications, connection state
 */

import AWS from "aws-sdk";
import { randomUUID } from "crypto";
import { v4 as uuid } from "uuid";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const apigwManagementApi = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT,
});
const threadsTable = process.env.THREADS_TABLE_NAME || process.env.DM_THREADS_TABLE;
const notificationsTable = process.env.NOTIFICATIONS_TABLE;

export const handler = async (event) => {
  console.log("📩 Received WS Message:", JSON.stringify(event, null, 2));

  let payload;
  try {
    payload = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    console.log("📦 Parsed Payload:", payload);
  } catch (err) {
    console.error("❌ Invalid JSON:", err);
    return { statusCode: 400, body: "Invalid JSON payload" };
  }

  const { action } = payload || {};
  if (!action) return { statusCode: 400, body: "Missing action" };

  const userId = event.requestContext?.authorizer?.userId;

  switch (action) {
      case "presenceLookup":
    return await handlePresenceLookup(event);

    case "sendMessage":
      return await handleSendMessage(payload);
    case "markRead":
      return await handleMarkRead(payload);
    case "deleteMessage":
      return await handleDeleteMessage(payload);
    case "editMessage":
      return await handleEditMessage(payload);
    case "toggleReaction":
      return await handleToggleReaction(payload);

    case "timelineUpdate":
    case "timelineDelete":
      return await broadcastTimelineUpdate(payload);
    case "setActiveConversation":
      return await handleSetActiveConversation(event, payload);
    case "timelineUpdated":
      return await persistTimelineUpdate(payload);
    case "projectUpdated":
      return await handleProjectUpdated(payload);
    case "budgetUpdated":
      return await handleBudgetUpdated(payload, userId);
    case "lineLocked":
      return await handleLineLocked(payload, userId);
    case "lineUnlocked":
      return await handleLineUnlocked(payload, userId);

    case "fetchNotifications": {
      if (!notificationsTable) return { statusCode: 200, body: "Notifications disabled" };
      const connectionId = event.requestContext.connectionId;

      const result = await dynamoDb
        .query({
          TableName: notificationsTable,
          KeyConditionExpression: "userId = :u",
          ExpressionAttributeValues: { ":u": userId },
          ScanIndexForward: false,
          Limit: 100,
        })
        .promise();

      await apigwManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify({ action: "notificationsBatch", items: result.Items || [] }),
        })
        .promise();

      return { statusCode: 200 };
    }

    default:
      console.warn("⚠️ Unknown action:", action);
      return { statusCode: 400, body: `Unknown action: ${action}` };
  }
};

const handleSetActiveConversation = async (event, payload) => {
  const connectionId = event.requestContext.connectionId;
  const { conversationId } = payload || {};

  if (!connectionId || !conversationId) {
    console.warn("⚠️ Missing connectionId or conversationId");
    return { statusCode: 400, body: "Missing connectionId or conversationId" };
  }

  try {
    await dynamoDb
      .update({
        TableName: process.env.CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: "SET activeConversation = :c",
        ExpressionAttributeValues: { ":c": String(conversationId).trim() },
        ConditionExpression: "attribute_exists(userId)" // ✅ only update if row is valid
      })
      .promise();

    console.log(`✅ Set activeConversation for ${connectionId} → ${conversationId}`);
    return { statusCode: 200, body: "Active conversation set" };
  } catch (err) {
    console.error("❌ Failed to set active conversation:", err);
    return { statusCode: 500, body: "DB update error" };
  }
};

const broadcastToConversation = async (conversationId, payload) => {
  try {
    const data = await dynamoDb.scan({ TableName: process.env.CONNECTIONS_TABLE }).promise();
    const connections = data.Items || [];

    const convIdTrim = String(conversationId || "").trim();
    const recipients = connections.filter(
      (c) => String(c.activeConversation || "").trim() === convIdTrim
    );

    if (recipients.length === 0) {
      console.warn("⚠️ No active connections for", convIdTrim);
      return;
    }

    const stale = [];

    await Promise.allSettled(
      recipients.map(async ({ connectionId }) => {
        try {
          await apigwManagementApi
            .postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(payload) })
            .promise();
        } catch (err) {
          if (err && err.statusCode === 410) stale.push(connectionId);
          else console.error("❌ WS send failed", err);
        }
      })
    );

    if (stale.length) {
      console.log("🧹 Cleaning stale connections:", stale);
      await Promise.allSettled(
        stale.map((id) =>
          dynamoDb
            .delete({ TableName: process.env.CONNECTIONS_TABLE, Key: { connectionId: id } })
            .promise()
        )
      );
    }
  } catch (err) {
    console.error("❌ broadcastToConversation error:", err);
  }
};

async function handlePresenceLookup(event) {
  const connectionId = event?.requestContext?.connectionId;
  if (!connectionId) return;

  const r = await dynamoDb.scan({
    TableName: process.env.CONNECTIONS_TABLE,
    ProjectionExpression: "userId",
  }).promise();

  const users = Array.from(
    new Set((r.Items || []).map(i => i.userId).filter(Boolean))
  );

  const payload = {
    action: "presenceSnapshot",
    userIds: users,
    at: new Date().toISOString(),
  };

  console.log("📤 Sending snapshot via presenceLookup to", connectionId, "with users:", users);

  await apigwManagementApi.postToConnection({
    ConnectionId: connectionId,
    Data: JSON.stringify(payload),
  }).promise();
}


async function broadcastToUser(userId, payload) {
  try {
    const data = await dynamoDb.scan({ TableName: process.env.CONNECTIONS_TABLE }).promise();
    const userConns = (data.Items || [])
      .filter((c) => c.userId === userId)
      .map((c) => c.connectionId);

    console.log("📡 [broadcastToUser] userId:", userId);
    console.log("📡 [broadcastToUser] Matched connections:", userConns);

    if (userConns.length === 0) {
      console.warn("🚫 No active connections for user", userId);
      return;
    }

    await Promise.allSettled(
      userConns.map((connId) =>
        apigwManagementApi
          .postToConnection({ ConnectionId: connId, Data: JSON.stringify(payload) })
          .promise()
      )
    );

    console.log("✅ [broadcastToUser] Broadcasted to all connections");
  } catch (err) {
    console.error("❌ broadcastToUser error:", err);
  }
}

async function saveNotification(userId, message, dedupeId, timestamp, senderId, projectId) {
  console.log("🔔 [saveNotification] Called with userId:", userId);

  if (!notificationsTable) {
    console.log("ℹ️ NOTIFICATIONS_TABLE not set; skipping saveNotification");
    return;
  }

  try {
    const existing = await dynamoDb
      .query({
        TableName: notificationsTable,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
        ScanIndexForward: false,
        Limit: 5,
      })
      .promise();

    if (existing.Items && existing.Items.some((n) => n.dedupeId === dedupeId)) {
      console.log("🔁 Duplicate notification skipped");
      return;
    }

    const ts = timestamp || new Date().toISOString();
    const sortKeyValue = `${ts}#${randomUUID()}`;
    const item = {
      userId,
      "timestamp#uuid": sortKeyValue,
      timestamp: ts,
      dedupeId,
      message,
      read: false,
      senderId,
      projectId,
    };

    await dynamoDb.put({ TableName: notificationsTable, Item: item }).promise();

    console.log("📨 [saveNotification] About to broadcast:", {
      userId,
      connectionPayload: { action: "notification", ...item },
    });

    await broadcastToUser(userId, { action: "notification", ...item });
  } catch (err) {
    console.error("❌ saveNotification error", err);
  }
}


async function saveProjectNotifications(projectId, message, dedupeId, senderId = null) {
  if (!notificationsTable) {
    console.log("ℹ️ NOTIFICATIONS_TABLE not set; skipping saveProjectNotifications");
    return;
  }

  try {
    const res = await dynamoDb
      .get({ TableName: process.env.PROJECTS_TABLE_NAME, Key: { projectId } })
      .promise();

    const teamArr = Array.isArray(res.Item?.team) ? res.Item.team.map((t) => t.userId) : [];
    if (senderId) teamArr.push(senderId);

    const recipients = Array.from(new Set(teamArr));
    const timestamp = new Date().toISOString();

    await Promise.all(
      recipients.map((uid) => saveNotification(uid, message, dedupeId, timestamp, senderId, projectId))
    );
  } catch (err) {
    console.error("❌ saveProjectNotifications error", err);
  }
}

async function deleteNotificationsByDedupeId(dedupeId) {
  if (!dedupeId) {
    console.error("❌ deleteNotificationsByDedupeId: missing dedupeId");
    return;
  }

  if (!notificationsTable) return;

  try {
    const { Items = [] } = await dynamoDb
      .query({
        TableName: notificationsTable,
        IndexName: "dedupeId-index",
        KeyConditionExpression: "dedupeId = :d",
        ExpressionAttributeValues: { ":d": dedupeId },
        ProjectionExpression: "userId, #ts",
        ExpressionAttributeNames: { "#ts": "timestamp#uuid" },
      })
      .promise();

    if (Items.length === 0) {
      console.warn("⚠️ No items found in GSI for that dedupeId");
      return;
    }

    const deleteRequests = Items.map((item) => ({
      DeleteRequest: { Key: { userId: item.userId, "timestamp#uuid": item["timestamp#uuid"] } },
    }));

    while (deleteRequests.length) {
      const batch = deleteRequests.splice(0, 25);
      await dynamoDb.batchWrite({ RequestItems: { [notificationsTable]: batch } }).promise();
    }

    console.log(`✅ Deleted ${Items.length} notifications for dedupeId=${dedupeId}`);
  } catch (err) {
    console.error("❌ deleteNotificationsByDedupeId error:", err);
  }
}

const handleSendMessage = async (payload) => {
  const { conversationType, conversationId, senderId, username, text, timestamp, title } = payload || {};

  if (!conversationType || !conversationId || !senderId || !text || !timestamp) {
    console.error("❌ Missing required message fields");
    return { statusCode: 400, body: "Missing required fields" };
  }

  let tableName;
  if (conversationType === "dm") tableName = process.env.DM_TABLE_NAME;
  else if (conversationType === "project") tableName = process.env.PROJECT_MESSAGES_TABLE_NAME;
  else return { statusCode: 400, body: "Invalid conversation type" };

  // For DM: sort pair for stable conversationId
  let finalConversationId = conversationId;
  if (conversationType === "dm") {
    const sortedIds = conversationId.replace("dm#", "").split("___").sort();
    finalConversationId = `dm#${sortedIds.join("___")}`;
  }

  const [uid1, uid2] = finalConversationId.replace("dm#", "").split("___");
  const recipientId = senderId === uid1 ? uid2 : uid1;

  const messageItem = {
    messageId: `MESSAGE#${timestamp}`,
    senderId,
    username,
    text,
    timestamp,
    conversationId: finalConversationId,
    GSI1PK: `USER#${recipientId}`,
    GSI1SK: timestamp,
    optimisticId: payload.optimisticId || undefined,
    reactions: {},
  };

  if (conversationType === "project") {
    messageItem.projectId = finalConversationId.replace("project#", "");
  }

  try {
    await dynamoDb.put({ TableName: tableName, Item: messageItem }).promise();
    console.log("✅ Message saved to DB with GSI:", messageItem);

    if (conversationType === "dm" && threadsTable) {
      const threadUpdateSender = {
        TableName: threadsTable,
        Key: { userId: senderId, conversationId: finalConversationId },
        UpdateExpression: `SET lastMsgTs = :ts, snippet = :snip, otherUserId = :other, #r = :true`,
        ExpressionAttributeNames: { "#r": "read" },
        ExpressionAttributeValues: {
          ":ts": timestamp,
          ":snip": text,
          ":other": recipientId,
          ":true": true,
        },
      };

      const threadUpdateRecipient = {
        TableName: threadsTable,
        Key: { userId: recipientId, conversationId: finalConversationId },
        UpdateExpression: `SET lastMsgTs = :ts, snippet = :snip, otherUserId = :other, #r = :false`,
        ExpressionAttributeNames: { "#r": "read" },
        ExpressionAttributeValues: {
          ":ts": timestamp,
          ":snip": text,
          ":other": senderId,
          ":false": false,
        },
      };

      await Promise.all([
        dynamoDb.update(threadUpdateSender).promise(),
        dynamoDb.update(threadUpdateRecipient).promise(),
      ]);
      console.log("✅ Threads updated");
    }
  } catch (err) {
    console.error("❌ Error writing message to DB:", err);
    return { statusCode: 500, body: "DB write error" };
  }

  if (conversationType === "project") {
    await broadcastToConversation(finalConversationId, {
      action: "newMessage",
      conversationType,
      ...messageItem,
    });

    const projectId = finalConversationId.replace("project#", "");
    const projectName = title || projectId;
    const senderName = username || senderId;
    const isFile = Array.isArray(messageItem.attachments) && messageItem.attachments.length > 0;
    const summary = isFile
      ? `📎 ${senderName} uploaded ${messageItem.attachments.length} file(s) in "${projectName}"`
      : `💬 ${senderName} in "${projectName}": ${text.length > 60 ? text.slice(0, 57) + "..." : text}`;

    await saveProjectNotifications(projectId, summary, messageItem.messageId, senderId);
    return { statusCode: 200, body: "Project message sent" };
  }

  await Promise.all([
    broadcastToUser(uid1, { action: "newMessage", conversationType: "dm", ...messageItem }),
    broadcastToUser(uid2, { action: "newMessage", conversationType: "dm", ...messageItem }),
  ]);

  await broadcastToConversation(finalConversationId, {
    action: "newMessage",
    conversationType,
    ...messageItem,
  });

  return { statusCode: 200, body: "Message sent successfully" };
};

const handleMarkRead = async ({ conversationType, conversationId, userId, read }) => {
  if (conversationType !== "dm") return { statusCode: 400, body: "Invalid conversationType" };

  const [uid1, uid2] = conversationId.replace("dm#", "").split("___");

  await Promise.all([
    broadcastToUser(uid1, { action: "markRead", conversationType: "dm", conversationId, userId, read }),
    broadcastToUser(uid2, { action: "markRead", conversationType: "dm", conversationId, userId, read }),
  ]);

  return { statusCode: 200, body: "Read state broadcasted" };
};

const handleDeleteMessage = async (payload) => {
  const { conversationType, conversationId, messageId } = payload || {};
  if (!conversationType || !conversationId || !messageId) {
    return { statusCode: 400, body: "Missing fields" };
  }

  const eventPayload = { action: "deleteMessage", conversationType, conversationId, messageId };

  if (conversationType === "dm") {
    const [uid1, uid2] = conversationId.replace("dm#", "").split("___");
    await Promise.all([
      broadcastToUser(uid1, eventPayload),
      broadcastToUser(uid2, eventPayload),
      broadcastToConversation(conversationId, eventPayload),
    ]);
  } else if (conversationType === "project") {
    await broadcastToConversation(conversationId, eventPayload);
    await deleteNotificationsByDedupeId(messageId);
  } else {
    return { statusCode: 400, body: "Invalid conversationType" };
  }

  return { statusCode: 200, body: "Delete broadcasted" };
};

const handleEditMessage = async (payload) => {
  const { conversationType, conversationId, messageId, text, editedAt, editedBy, timestamp, projectId } = payload || {};
  if (!conversationType || !conversationId || !messageId || !text) {
    return { statusCode: 400, body: "Missing fields" };
  }

  const eventPayload = {
    action: "editMessage",
    conversationType,
    conversationId,
    messageId,
    text,
    editedAt: editedAt || new Date().toISOString(),
    editedBy,
    timestamp,
    projectId,
  };

  if (conversationType === "dm") {
    const [uid1, uid2] = conversationId.replace("dm#", "").split("___");
    await Promise.all([
      broadcastToUser(uid1, eventPayload),
      broadcastToUser(uid2, eventPayload),
      broadcastToConversation(conversationId, eventPayload),
    ]);
  } else if (conversationType === "project") {
    await broadcastToConversation(conversationId, eventPayload);
  } else {
    return { statusCode: 400, body: "Invalid conversationType" };
  }

  return { statusCode: 200, body: "Edit broadcasted" };
};

const handleToggleReaction = async (payload) => {
  const { conversationType, conversationId, messageId, emoji, userId } = payload || {};

  if (!conversationType || !conversationId || !messageId || !emoji || !userId) {
    return { statusCode: 400, body: "Missing fields" };
  }

  let tableName;
  let key;
  if (conversationType === "dm") {
    tableName = process.env.DM_TABLE_NAME;
    key = { conversationId, messageId };
  } else if (conversationType === "project") {
    tableName = process.env.PROJECT_MESSAGES_TABLE_NAME;
    const projectId = String(conversationId).replace("project#", "");
    key = { projectId, messageId };
  } else {
    return { statusCode: 400, body: "Invalid conversationType" };
  }

  let item;
  try {
    const res = await dynamoDb.get({ TableName: tableName, Key: key }).promise();
    item = res.Item;
    if (!item) return { statusCode: 404, body: "Message not found" };
  } catch (err) {
    console.error("❌ Failed to fetch message for toggleReaction", err);
    return { statusCode: 500, body: "DB get error" };
  }

  const reactions = { ...(item.reactions || {}) };
  const users = new Set(reactions[emoji] || []);
  if (users.has(userId)) users.delete(userId);
  else users.add(userId);
  if (users.size > 0) reactions[emoji] = Array.from(users);
  else delete reactions[emoji];

  try {
    await dynamoDb
      .update({
        TableName: tableName,
        Key: key,
        UpdateExpression: "SET reactions = :r",
        ExpressionAttributeValues: { ":r": reactions },
      })
      .promise();
  } catch (err) {
    console.error("❌ Failed to update reactions", err);
    return { statusCode: 500, body: "DB update error" };
  }

  const eventPayload = {
    action: "toggleReaction",
    conversationType,
    conversationId,
    messageId,
    reactions,
    projectId: key.projectId,
  };

  if (conversationType === "dm") {
    const [uid1, uid2] = conversationId.replace("dm#", "").split("___");
    await Promise.all([
      broadcastToUser(uid1, eventPayload),
      broadcastToUser(uid2, eventPayload),
      broadcastToConversation(conversationId, eventPayload),
    ]);
  } else {
    await broadcastToConversation(conversationId, eventPayload);
  }

  return { statusCode: 200, body: "Reaction toggled" };
};

const broadcastTimelineUpdate = async ({ conversationType, conversationId, events, action }) => {
  if (conversationType !== "project" || !conversationId || !Array.isArray(events)) {
    return { statusCode: 400, body: "Invalid timeline payload" };
  }

  await broadcastToConversation(conversationId, {
    action,
    conversationType,
    conversationId,
    events,
  });

  return { statusCode: 200, body: "Timeline broadcasted" };
};

const persistTimelineUpdate = async (payload) => {
  const {
    projectId,
    title,
    events = [],
    conversationId,
    username,
    senderId,
    timelineAction,
  } = payload || {};

  if (!projectId || !Array.isArray(events)) {
    return { statusCode: 400, body: "Missing projectId or events" };
  }

  const newEvents = events.map((ev) => {
    const id = ev.id || ev.eventId || uuid();
    return {
      id,
      eventId: ev.eventId || id,
      date: ev.date,
      description: ev.description || ev.payload?.description,
      hours: ev.hours,
      budgetItemId: ev.budgetItemId,
      createdBy: ev.createdBy,
    };
  });

  const wsPayload = { action: "timelineUpdated", projectId, events: newEvents };
  await broadcastToConversation(conversationId, wsPayload);

  const sendNotification = async (ev) => {
    const desc = ev.description || "";
    const verb =
      timelineAction === "added"
        ? "added"
        : timelineAction === "deleted"
          ? "deleted"
          : "modified";
    const msg = `${username || "Someone"} ${verb} "${desc}" in "${title || projectId}" ${ev.date} `;
    const dedupe = `timeline#${projectId}#${verb}#${ev.id}`;
    await saveProjectNotifications(projectId, msg, dedupe, senderId, username);
  };

  if (newEvents[0]) await sendNotification(newEvents[0]);

  return { statusCode: 200, body: "timeline broadcast" };
};

const handleProjectUpdated = async (payload) => {
  console.log("🧠 [handleProjectUpdated] Called with payload:", JSON.stringify(payload, null, 2));

  const { projectId, title, fields, conversationId, username, senderId } = payload || {};

  if (!projectId || !fields) {
    console.warn("⚠️ [handleProjectUpdated] Missing projectId or fields");
    return { statusCode: 400, body: "Missing projectId or fields" };
  }

  try {
    console.log("📣 [handleProjectUpdated] Broadcasting to conversation:", conversationId);
    await broadcastToConversation(conversationId, {
      action: "projectUpdated",
      projectId,
      fields,
    });
    console.log("✅ [handleProjectUpdated] Broadcast sent");
  } catch (err) {
    console.error("❌ [handleProjectUpdated] Failed broadcastToConversation", err);
  }

  try {
    const displayName = title || projectId;
    const sender = username || "Someone";

    const formatValue = (key, value) => {
      if (key === "budget" && value && typeof value === "object") {
        const total = value.total ? `$${Number(value.total).toLocaleString()}` : null;
        const date = value.date || null;
        return [total, date].filter(Boolean).join(" on ");
      }
      if (Array.isArray(value)) return value.map((v) => String(v).replace(/\n/g, " ")).join(", ");
      if (value && typeof value === "object") return JSON.stringify(value);
      return String(value);
    };

    const readableChanges = Object.entries(fields)
      .map(([key, value]) => `${key}: ${formatValue(key, value)}`)
      .join(" | ");

    const msg = `${sender} updated ${displayName} → ${readableChanges}`;
    const projectDedupe = `project#${projectId}#${Date.now()}`;

    console.log("📨 [handleProjectUpdated] Final message:", msg);
    console.log("📨 [handleProjectUpdated] Sending to saveProjectNotifications");

    await saveProjectNotifications(projectId, msg, projectDedupe, senderId, username);
    console.log("✅ [handleProjectUpdated] Notifications fanned out");

  } catch (err) {
    console.error("❌ [handleProjectUpdated] Failed saveProjectNotifications", err);
  }

  return { statusCode: 200, body: "project update broadcast" };
};


const handleBudgetUpdated = async (payload, senderId) => {
  const { projectId, title, revision, total, conversationId, username } = payload || {};

  if (!projectId) return { statusCode: 400, body: "Missing projectId" };

  await broadcastToConversation(conversationId, {
    action: "budgetUpdated",
    projectId,
    revision,
    total,
    senderId,
  });

  const totalStr = total ? `$${Number(total).toLocaleString()}` : "N/A";
  const displayName = title || projectId;
  const revPart = revision ? `revision ${revision} ` : "";
  const sender = username || "Someone";
  const msg = `${sender} updated budget ${revPart}for "${displayName}" → ${totalStr}`;

  const windowMinutes = parseInt(process.env.BUDGET_NOTIF_WINDOW_MINUTES || "10", 10);
  const bucket = Math.floor(Date.now() / (windowMinutes * 60 * 1000));
  const actionType = "update";
  const dedupeId = `budget#${projectId}#${revision || "unknown"}#${actionType}#${bucket}`;

  await saveProjectNotifications(projectId, msg, dedupeId, senderId, username);

  return { statusCode: 200, body: "budget update broadcast" };
};

const handleLineLocked = async (payload, senderId) => {
  const { projectId, lineId, revision, conversationId } = payload || {};
  if (!projectId || !lineId) return { statusCode: 400, body: "Missing projectId or lineId" };

  await broadcastToConversation(conversationId, {
    action: "lineLocked",
    projectId,
    lineId,
    revision,
    senderId,
  });

  return { statusCode: 200, body: "lineLocked broadcast" };
};

const handleLineUnlocked = async (payload, senderId) => {
  const { projectId, lineId, revision, conversationId } = payload || {};
  if (!projectId || !lineId) return { statusCode: 400, body: "Missing projectId or lineId" };

  await broadcastToConversation(conversationId, {
    action: "lineUnlocked",
    projectId,
    lineId,
    revision,
    senderId,
  });

  return { statusCode: 200, body: "lineUnlocked broadcast" };
};
