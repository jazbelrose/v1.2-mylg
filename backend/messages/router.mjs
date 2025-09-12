// backend/messages/router.mjs
import { corsHeadersFromEvent, preflightFromEvent, json } from "/opt/nodejs/utils/cors.mjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

/* ------------ ENV ------------ */
const REGION = process.env.AWS_REGION || "us-west-2";

// Inbox entries
const INBOX_TABLE           = process.env.INBOX_TABLE;

// Messages
const MESSAGES_TABLE        = process.env.MESSAGES_TABLE        || "Messages";

// Project-scoped messages
const PROJECT_MESSAGES_TABLE = process.env.PROJECT_MESSAGES_TABLE || "ProjectMessages";

// Notifications
const NOTIFICATIONS_TABLE          = process.env.NOTIFICATIONS_TABLE          || "Notifications";
const NOTIFICATIONS_BY_USER_INDEX  = process.env.NOTIFICATIONS_BY_USER_INDEX  || "userId-index";

// Dev-only: allow scans without userId
const SCANS_ALLOWED = (process.env.SCANS_ALLOWED || "false").toLowerCase() === "true";

/* ------------ DDB ------------ */
const ddb = DynamoDBDocument.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

/* ------------ utils ------------ */
const M = (e) => e?.requestContext?.http?.method?.toUpperCase?.() || e?.httpMethod?.toUpperCase?.() || "GET";
const P = (e) => (e?.rawPath || e?.path || "/");
const Q = (e) => e?.queryStringParameters || {};
const B = (e) => { try { return JSON.parse(e?.body || "{}"); } catch { return {}; } };
const nowISO = () => new Date().toISOString();
const makeMsgId = (ts = Date.now()) => `MESSAGE#${String(ts).padStart(13, "0")}#${uuidv4()}`;

function buildUpdate(obj) {
  const Names = {}, Values = {}, sets = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    Names["#" + k] = k;
    Values[":" + k] = v;
    sets.push(`#${k} = :${k}`);
  }
  if (!sets.length) return null;
  return {
    UpdateExpression: "SET " + sets.join(", "),
    ExpressionAttributeNames: Names,
    ExpressionAttributeValues: Values,
  };
}

/* ------------ Handlers ------------ */
const health = async (_e, C) => json(200, C, { ok: true, domain: "messages" });

/* Inbox: list conversations for a userId */
const getInbox = async (e, C) => {
  const userId = Q(e).userId;
  if (!userId) return json(400, C, { error: "userId required" });

  const r = await ddb.query({
    TableName: INBOX_TABLE,
    KeyConditionExpression: "userId = :u",
    ExpressionAttributeValues: { ":u": userId },
    ScanIndexForward: false,
  });

  r.Items?.sort((a, b) => String(b.lastMsgTs || "").localeCompare(String(a.lastMsgTs || "")));
  return json(200, C, { userId, inbox: r.Items || [] });
};

/* GET /messages/threads?userId=...  (alias to inbox)
   If userId omitted and SCANS_ALLOWED=true → scan Inbox (dev only) */
const listThreads = async (e, C) => {
  const userId = Q(e).userId;
  if (userId) return getInbox(e, C);
  if (!SCANS_ALLOWED) return json(400, C, { error: "userId required (set SCANS_ALLOWED=true to scan for dev)" });

  const r = await ddb.scan({ TableName: INBOX_TABLE, Limit: 100 });
  r.Items?.sort((a, b) => String(b.lastMsgTs || "").localeCompare(String(a.lastMsgTs || "")));
  return json(200, C, { inbox: r.Items || [] });
};

/* Create a conversation: body { participants: [userIds], projectId?, title? } */
const createConversation = async (e, C) => {
  const b = B(e);
  const participants = Array.isArray(b.participants) ? b.participants.filter(Boolean) : [];
  if (participants.length < 2) return json(400, C, { error: "participants (>=2) required" });

  const ts = nowISO();
  const conversationId = b.conversationId || `C-${uuidv4()}`;

  for (const uid of participants) {
    await ddb.put({
      TableName: INBOX_TABLE,
      Item: {
        userId: uid,
        conversationId,
        participants,
        projectId: b.projectId,
        title: b.title,
        createdAt: ts,
        updatedAt: ts,
        lastMsgTs: null,
        snippet: "",
        meta: b.meta || {},
      },
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(conversationId)",
    });
  }

  return json(201, C, { conversation: { conversationId, participants, projectId: b.projectId, title: b.title, createdAt: ts, updatedAt: ts } });
};

const getConversation = async (e, C, { conversationId }) => {
  const userId = Q(e).userId;
  if (!userId) return json(400, C, { error: "userId required" });
  const r = await ddb.get({ TableName: INBOX_TABLE, Key: { userId, conversationId } });
  return json(200, C, { conversation: r.Item || null });
};

/* Messages in a conversation
   MESSAGES_TABLE: PK=conversationId, SK=messageId (MESSAGE#<millis>#uuid) */
const listConversationMessages = async (e, C, { conversationId }) => {
  const q = Q(e);
  const limit = Math.min(parseInt(q.limit || "50", 10), 200);
  const r = await ddb.query({
    TableName: MESSAGES_TABLE,
    KeyConditionExpression: "conversationId = :c",
    ExpressionAttributeValues: { ":c": conversationId },
    ScanIndexForward: true,
    Limit: limit,
    ExclusiveStartKey: q.nextKey ? JSON.parse(q.nextKey) : undefined,
  });
  return json(200, C, {
    conversationId,
    messages: r.Items || [],
    nextKey: r.LastEvaluatedKey ? JSON.stringify(r.LastEvaluatedKey) : null,
  });
};

const postConversationMessage = async (e, C, { conversationId }) => {
  const b = B(e);
  if (!b.senderId) return json(400, C, { error: "senderId required" });
  if (!b.text && !b.body && !b.content) return json(400, C, { error: "text/body/content required" });

  const tsMillis = Date.now();
  const messageId = b.messageId || makeMsgId(tsMillis);
  const ts = b.timestamp || new Date(tsMillis).toISOString();

  let participants = b.participants;
  if (!participants) {
    const pr = await ddb.get({ TableName: INBOX_TABLE, Key: { userId: b.senderId, conversationId } });
    participants = pr.Item?.participants || [];
  }
  const recipientId = participants.find((p) => p !== b.senderId);

  const msg = {
    conversationId,
    messageId,
    senderId: b.senderId,
    text: b.text,
    body: b.body,
    content: b.content,
    reactions: b.reactions || {},
    timestamp: ts,
    meta: b.meta || {},
    GSI1PK: recipientId ? `USER#${recipientId}` : undefined,
    GSI1SK: ts,
  };

  await ddb.put({
    TableName: MESSAGES_TABLE,
    Item: msg,
    ConditionExpression: "attribute_not_exists(conversationId) AND attribute_not_exists(messageId)",
  });

  const snippet = (msg.text || msg.body || msg.content || "").toString().slice(0, 180);
  await Promise.all(
    (participants || []).map((uid) => {
      const otherUserId = participants.find((p) => p !== uid);
      const read = uid === b.senderId;
      return ddb.update({
        TableName: INBOX_TABLE,
        Key: { userId: uid, conversationId },
        UpdateExpression:
          "SET #snippet = :s, #lastMsgTs = :ts, #updatedAt = :u, #otherUserId = :ou, #read = :r",
        ExpressionAttributeNames: {
          "#snippet": "snippet",
          "#lastMsgTs": "lastMsgTs",
          "#updatedAt": "updatedAt",
          "#otherUserId": "otherUserId",
          "#read": "read",
        },
        ExpressionAttributeValues: {
          ":s": snippet,
          ":ts": ts,
          ":u": nowISO(),
          ":ou": otherUserId,
          ":r": read,
        },
      });
    })
  );

  return json(201, C, { conversationId, message: msg });
};

/* Patch / Delete message by messageId
   Requires conversationId (body for patch, query param for delete). */
const patchMessage = async (e, C, { messageId }) => {
  const b = B(e);
  const conversationId = b.conversationId;
  if (!conversationId) return json(400, C, { error: "conversationId required in body" });

  const upd = buildUpdate({ ...b, updatedAt: nowISO() });
  if (!upd) return json(400, C, { error: "No fields to update" });

  const r = await ddb.update({
    TableName: MESSAGES_TABLE,
    Key: { conversationId, messageId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });
  return json(200, C, { message: r.Attributes });
};

const deleteMessage = async (e, C, { messageId }) => {
  const conversationId = Q(e).conversationId;
  if (!conversationId) return json(400, C, { error: "conversationId query param required" });
  await ddb.delete({ TableName: MESSAGES_TABLE, Key: { conversationId, messageId } });
  return json(204, C, "");
};

/* Project-scoped messages: PROJECT_MESSAGES_TABLE (PK=projectId, SK=messageId) */
const listProjectMessages = async (e, C, { projectId }) => {
  projectId = projectId || Q(e).projectId;
  if (!projectId) return json(400, C, { error: "projectId required" });

  const r = await ddb.query({
    TableName: PROJECT_MESSAGES_TABLE,
    KeyConditionExpression: "projectId = :p",
    ExpressionAttributeValues: { ":p": projectId },
    ScanIndexForward: true,
  });
  return json(200, C, { projectId, messages: r.Items || [] });
};

const postProjectMessage = async (e, C, { projectId }) => {
  const b = B(e);
  if (!b.senderId) return json(400, C, { error: "senderId required" });
  if (!b.text && !b.body && !b.content) return json(400, C, { error: "text/body/content required" });

  const tsMillis = Date.now();
  const messageId = b.messageId || makeMsgId(tsMillis);
  const ts = b.timestamp || new Date(tsMillis).toISOString();

  const item = {
    projectId,
    messageId,
    senderId: b.senderId,
    text: b.text,
    body: b.body,
    content: b.content,
    reactions: b.reactions || {},
    timestamp: ts,
    meta: b.meta || {},
  };

  await ddb.put({
    TableName: PROJECT_MESSAGES_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(projectId) AND attribute_not_exists(messageId)",
  });

  return json(201, C, { projectId, message: item });
};

/* ----------------- Notifications -----------------
   NOTIFICATIONS_TABLE:
     PK: userId, SK: notificationId (e.g., N#<millis>#uuid)
     attrs: title, body, type, projectId?, createdAt, readAt?, meta
---------------------------------------------------*/

const listNotifications = async (e, C) => {
  const userId = Q(e).userId;
  if (!userId) return json(400, C, { error: "userId required" });

  // Prefer GSI if table shape differs; default is PK=userId
  const r = await ddb.query({
    TableName: NOTIFICATIONS_TABLE,
    KeyConditionExpression: "userId = :u",
    ExpressionAttributeValues: { ":u": userId },
    ScanIndexForward: false,
    Limit: Math.min(parseInt(Q(e).limit || "100", 10), 500),
  });

  return json(200, C, { userId, notifications: r.Items || [] });
};

const sendNotification = async (e, C) => {
  const b = B(e);
  const userId = b.userId || b.recipientId; // allow both names
  if (!userId) return json(400, C, { error: "userId (recipient) required" });

  const ts = Date.now();
  const notificationId = b.notificationId || `N#${String(ts).padStart(13, "0")}#${uuidv4()}`;

  const item = {
    userId,
    notificationId,
    title: b.title || "",
    body: b.body || "",
    type: b.type || "project",
    projectId: b.projectId,
    createdAt: new Date(ts).toISOString(),
    readAt: b.readAt || null,
    meta: b.meta || {},
  };

  await ddb.put({
    TableName: NOTIFICATIONS_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(notificationId)",
  });

  return json(201, C, { notification: item });
};

const patchNotification = async (e, C, { notificationId }) => {
  const b = B(e);
  const userId = b.userId || Q(e).userId;
  if (!userId) return json(400, C, { error: "userId required (body or query)" });

  const upd = buildUpdate({
    ...(b.title !== undefined ? { title: b.title } : {}),
    ...(b.body  !== undefined ? { body:  b.body }  : {}),
    ...(b.type  !== undefined ? { type:  b.type }  : {}),
    ...(b.projectId !== undefined ? { projectId: b.projectId } : {}),
    ...(b.readAt !== undefined ? { readAt: b.readAt || nowISO() } : {}),
    updatedAt: nowISO(),
  });
  if (!upd) return json(400, C, { error: "No fields to update" });

  const r = await ddb.update({
    TableName: NOTIFICATIONS_TABLE,
    Key: { userId, notificationId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });

  return json(200, C, { notification: r.Attributes });
};

const deleteNotification = async (e, C, { notificationId }) => {
  const userId = Q(e).userId || B(e).userId;
  if (!userId) return json(400, C, { error: "userId required (query or body)" });

  await ddb.delete({
    TableName: NOTIFICATIONS_TABLE,
    Key: { userId, notificationId },
  });
  return json(204, C, "");
};

/* ------------ Routes ------------ */
const routes = [
  { m: "GET",   r: /^\/messages\/health$/i,                               h: health },

  // inbox & conversations
  { m: "GET",   r: /^\/messages\/inbox$/i,                                 h: getInbox },
  { m: "GET",   r: /^\/messages\/threads$/i,                               h: listThreads },
  { m: "POST",  r: /^\/messages\/threads$/i,                               h: createConversation },
  { m: "GET",   r: /^\/messages\/threads\/(?<conversationId>[^/]+)$/i,     h: getConversation },

  // conversation messages
  { m: "GET",   r: /^\/messages\/threads\/(?<conversationId>[^/]+)\/messages$/i, h: listConversationMessages },
  { m: "POST",  r: /^\/messages\/threads\/(?<conversationId>[^/]+)\/messages$/i, h: postConversationMessage },

  // individual message ops by id
  // v1.2 path:
  { m: "PATCH", r: /^\/messages\/(?<messageId>[^/]+)$/i,                   h: patchMessage },
  { m: "DELETE",r: /^\/messages\/(?<messageId>[^/]+)$/i,                   h: deleteMessage },
  // v1.1 compat alias:
  { m: "PATCH", r: /^\/messages\/messages\/(?<messageId>[^/]+)$/i,         h: patchMessage },
  { m: "DELETE",r: /^\/messages\/messages\/(?<messageId>[^/]+)$/i,         h: deleteMessage },

  // project messages (query param)
  { m: "GET",   r: /^\/messages$/i,                                        h: listProjectMessages },

  // project-scoped
  { m: "GET",   r: /^\/messages\/project\/(?<projectId>[^/]+)$/i,          h: listProjectMessages },
  { m: "POST",  r: /^\/messages\/project\/(?<projectId>[^/]+)$/i,          h: postProjectMessage },

  // notifications (v1.2)
  { m: "GET",   r: /^\/messages\/notifications$/i,                         h: listNotifications },
  { m: "POST",  r: /^\/messages\/notifications$/i,                         h: sendNotification },
  { m: "PATCH", r: /^\/messages\/notifications\/(?<notificationId>[^/]+)$/i, h: patchNotification },
  { m: "DELETE",r: /^\/messages\/notifications\/(?<notificationId>[^/]+)$/i, h: deleteNotification },

  // v1.1 compat aliases
  { m: "GET",   r: /^\/getDirectMessages$/i,                                h: listConversationMessages },
  { m: "GET",   r: /^\/getDmInbox$/i,                                       h: getInbox },
  { m: "GET",   r: /^\/getProjectMessages$/i,                               h: listProjectMessages },
  { m: "GET",   r: /^\/getNotifications$/i,                                h: listNotifications },
  { m: "POST",  r: /^\/SendProjectNotification$/i,                         h: sendNotification },
];

export async function handler(event) {
  if (M(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const method = M(event);
  const path = P(event);

  try {
    for (const { m, r, h } of routes) {
      if (m !== method) continue;
      const match = r.exec(path);
      if (match) return await h(event, CORS, match.groups || {});
    }
    return json(404, CORS, { error: "Not found", method, path });
  } catch (err) {
    console.error("messages_router_error", { method, path, err });
    const msg = err?.message || "Server error";
    const status = /ConditionalCheckFailed/i.test(msg) ? 409 : 500;
    return json(status, CORS, { error: msg });
  }
}
