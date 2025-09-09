// backend/messages/router.mjs
import { corsHeadersFromEvent, preflightFromEvent, json } from "/opt/nodejs/utils/cors.mjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

/* ------------ ENV ------------ */
const REGION = process.env.AWS_REGION || "us-west-2";

// Threads & membership
const THREADS_TABLE         = process.env.THREADS_TABLE         || "MessagesThreads";
const THREAD_MEMBERS_TABLE  = process.env.THREAD_MEMBERS_TABLE  || "MessagesThreadMembers";

// Messages
const MESSAGES_TABLE        = process.env.MESSAGES_TABLE        || "Messages";
const MESSAGES_BY_ID_INDEX  = process.env.MESSAGES_BY_ID_INDEX  || ""; // e.g., "messageId-index"

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
const makeMsgId = (ts = Date.now()) => `M#${String(ts).padStart(13, "0")}#${uuidv4()}`;

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

async function batchGetThreads(threadIds) {
  const chunks = [];
  for (let i = 0; i < threadIds.length; i += 100) chunks.push(threadIds.slice(i, i + 100));
  const out = [];
  for (const ch of chunks) {
    const r = await ddb.batchGet({
      RequestItems: { [THREADS_TABLE]: { Keys: ch.map((id) => ({ threadId: id })) } },
    });
    out.push(...(r.Responses?.[THREADS_TABLE] || []));
  }
  return out;
}

/* ------------ Handlers ------------ */
const health = async (_e, C) => json(200, C, { ok: true, domain: "messages" });

/* Inbox: list threads for a userId via membership table
   THREAD_MEMBERS_TABLE: PK=userId, SK=threadId, attrs: lastReadTs, joinedAt, state */
const getInbox = async (e, C) => {
  const userId = Q(e).userId;
  if (!userId) return json(400, C, { error: "userId required" });

  const r = await ddb.query({
    TableName: THREAD_MEMBERS_TABLE,
    KeyConditionExpression: "userId = :u",
    ExpressionAttributeValues: { ":u": userId },
    ScanIndexForward: false,
  });
  const threadIds = (r.Items || []).map((m) => m.threadId);
  if (threadIds.length === 0) return json(200, C, { userId, inbox: [] });

  const threads = await batchGetThreads(threadIds);
  threads.sort((a, b) => String(b.lastMsgTs || "").localeCompare(String(a.lastMsgTs || "")));
  return json(200, C, { userId, inbox: threads });
};

/* GET /messages/threads?userId=...  (alias to inbox)
   If userId omitted and SCANS_ALLOWED=true → scan Threads (dev only) */
const listThreads = async (e, C) => {
  const userId = Q(e).userId;
  if (userId) return getInbox(e, C);
  if (!SCANS_ALLOWED) return json(400, C, { error: "userId required (set SCANS_ALLOWED=true to scan for dev)" });

  const r = await ddb.scan({ TableName: THREADS_TABLE, Limit: 100 });
  r.Items?.sort((a, b) => String(b.lastMsgTs || "").localeCompare(String(a.lastMsgTs || "")));
  return json(200, C, { threads: r.Items || [] });
};

/* Create a thread: body { participants: [userIds], projectId?, title? } */
const createThread = async (e, C) => {
  const b = B(e);
  const participants = Array.isArray(b.participants) ? b.participants.filter(Boolean) : [];
  if (participants.length < 2) return json(400, C, { error: "participants (>=2) required" });

  const ts = nowISO();
  const threadId = b.threadId || `T-${uuidv4()}`;
  const thread = {
    threadId,
    participants,
    projectId: b.projectId,
    title: b.title,
    createdAt: ts,
    updatedAt: ts,
    lastMsgTs: null,
    snippet: "",
    meta: b.meta || {},
  };

  await ddb.put({
    TableName: THREADS_TABLE,
    Item: thread,
    ConditionExpression: "attribute_not_exists(threadId)",
  });

  for (const uid of participants) {
    await ddb.put({
      TableName: THREAD_MEMBERS_TABLE,
      Item: {
        userId: uid,
        threadId,
        joinedAt: ts,
        lastReadTs: null,
        state: "active",
      },
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(threadId)",
    });
  }

  return json(201, C, { thread });
};

const getThread = async (_e, C, { threadId }) => {
  const r = await ddb.get({ TableName: THREADS_TABLE, Key: { threadId } });
  return json(200, C, { thread: r.Item || null });
};

/* Messages in a thread
   MESSAGES_TABLE: PK=threadId, SK=messageId (M#<millis>#uuid) */
const listThreadMessages = async (e, C, { threadId }) => {
  const q = Q(e);
  const limit = Math.min(parseInt(q.limit || "50", 10), 200);
  const r = await ddb.query({
    TableName: MESSAGES_TABLE,
    KeyConditionExpression: "threadId = :t",
    ExpressionAttributeValues: { ":t": threadId },
    ScanIndexForward: true,
    Limit: limit,
    ExclusiveStartKey: q.nextKey ? JSON.parse(q.nextKey) : undefined,
  });
  return json(200, C, {
    threadId,
    messages: r.Items || [],
    nextKey: r.LastEvaluatedKey ? JSON.stringify(r.LastEvaluatedKey) : null,
  });
};

const postThreadMessage = async (e, C, { threadId }) => {
  const b = B(e);
  if (!b.senderId) return json(400, C, { error: "senderId required" });
  if (!b.text && !b.body && !b.content) return json(400, C, { error: "text/body/content required" });

  const tsMillis = Date.now();
  const messageId = b.messageId || makeMsgId(tsMillis);
  const ts = b.timestamp || new Date(tsMillis).toISOString();

  const msg = {
    threadId,
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
    TableName: MESSAGES_TABLE,
    Item: msg,
    ConditionExpression: "attribute_not_exists(threadId) AND attribute_not_exists(messageId)",
  });

  await ddb.update({
    TableName: THREADS_TABLE,
    Key: { threadId },
    UpdateExpression: "SET #snippet = :s, #last = :ts, #updatedAt = :u",
    ExpressionAttributeNames: { "#snippet": "snippet", "#last": "lastMsgTs", "#updatedAt": "updatedAt" },
    ExpressionAttributeValues: {
      ":s": (msg.text || msg.body || msg.content || "").toString().slice(0, 180),
      ":ts": ts,
      ":u": nowISO(),
    },
  });

  return json(201, C, { threadId, message: msg });
};

/* Patch / Delete message by messageId
   If no GSI is configured, client must provide threadId (body or query). */
const patchMessage = async (e, C, { messageId }) => {
  const b = B(e);
  let threadId = b.threadId;
  if (!threadId) {
    if (!MESSAGES_BY_ID_INDEX) return json(400, C, { error: "threadId required in body (no messageId index configured)" });
    const qr = await ddb.query({
      TableName: MESSAGES_TABLE,
      IndexName: MESSAGES_BY_ID_INDEX,
      KeyConditionExpression: "messageId = :m",
      ExpressionAttributeValues: { ":m": messageId },
      Limit: 1,
    });
    const found = qr.Items?.[0];
    if (!found) return json(404, C, { error: "message not found" });
    threadId = found.threadId;
  }

  const upd = buildUpdate({ ...b, updatedAt: nowISO() });
  if (!upd) return json(400, C, { error: "No fields to update" });

  const r = await ddb.update({
    TableName: MESSAGES_TABLE,
    Key: { threadId, messageId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });
  return json(200, C, { message: r.Attributes });
};

const deleteMessage = async (e, C, { messageId }) => {
  let threadId = Q(e).threadId;
  if (!threadId) {
    if (!MESSAGES_BY_ID_INDEX) return json(400, C, { error: "threadId query param required (no messageId index configured)" });
    const qr = await ddb.query({
      TableName: MESSAGES_TABLE,
      IndexName: MESSAGES_BY_ID_INDEX,
      KeyConditionExpression: "messageId = :m",
      ExpressionAttributeValues: { ":m": messageId },
      Limit: 1,
    });
    const found = qr.Items?.[0];
    if (!found) return json(404, C, { error: "message not found" });
    threadId = found.threadId;
  }
  await ddb.delete({ TableName: MESSAGES_TABLE, Key: { threadId, messageId } });
  return json(204, C, "");
};

/* Project-scoped messages: PROJECT_MESSAGES_TABLE (PK=projectId, SK=messageId) */
const listProjectMessages = async (_e, C, { projectId }) => {
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

  // inbox & threads
  { m: "GET",   r: /^\/messages\/inbox$/i,                                 h: getInbox },
  { m: "GET",   r: /^\/messages\/threads$/i,                               h: listThreads },
  { m: "POST",  r: /^\/messages\/threads$/i,                               h: createThread },
  { m: "GET",   r: /^\/messages\/threads\/(?<threadId>[^/]+)$/i,           h: getThread },

  // thread messages
  { m: "GET",   r: /^\/messages\/threads\/(?<threadId>[^/]+)\/messages$/i, h: listThreadMessages },
  { m: "POST",  r: /^\/messages\/threads\/(?<threadId>[^/]+)\/messages$/i, h: postThreadMessage },

  // individual message ops by id
  // v1.2 path:
  { m: "PATCH", r: /^\/messages\/(?<messageId>[^/]+)$/i,                   h: patchMessage },
  { m: "DELETE",r: /^\/messages\/(?<messageId>[^/]+)$/i,                   h: deleteMessage },
  // v1.1 compat alias:
  { m: "PATCH", r: /^\/messages\/messages\/(?<messageId>[^/]+)$/i,         h: patchMessage },
  { m: "DELETE",r: /^\/messages\/messages\/(?<messageId>[^/]+)$/i,         h: deleteMessage },

  // project-scoped
  { m: "GET",   r: /^\/messages\/project\/(?<projectId>[^/]+)$/i,          h: listProjectMessages },
  { m: "POST",  r: /^\/messages\/project\/(?<projectId>[^/]+)$/i,          h: postProjectMessage },

  // notifications (v1.2)
  { m: "GET",   r: /^\/messages\/notifications$/i,                         h: listNotifications },
  { m: "POST",  r: /^\/messages\/notifications$/i,                         h: sendNotification },
  { m: "PATCH", r: /^\/messages\/notifications\/(?<notificationId>[^/]+)$/i, h: patchNotification },
  { m: "DELETE",r: /^\/messages\/notifications\/(?<notificationId>[^/]+)$/i, h: deleteNotification },

  // v1.1 compat aliases
  { m: "GET",   r: /^\/getDirectMessages$/i,                                h: listThreadMessages },
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
