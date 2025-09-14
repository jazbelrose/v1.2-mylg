// backend/messages/router.mjs
import { corsHeadersFromEvent, preflightFromEvent, json } from "/opt/nodejs/utils/cors.mjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

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

/**
 * Normalizes a DM conversation ID by sorting the user IDs
 * @param conversationId - The conversation ID to normalize (e.g., "dm#user2___user1")
 * @returns The normalized conversation ID (e.g., "dm#user1___user2")
 */
function normalizeDMConversationId(conversationId) {
  if (!conversationId.startsWith('dm#')) {
    return conversationId;
  }
  
  const userIds = conversationId.replace('dm#', '').split('___');
  if (userIds.length !== 2) {
    return conversationId;
  }
  
  const sortedIds = userIds.sort();
  return `dm#${sortedIds.join('___')}`;
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
  const normalizedId = normalizeDMConversationId(conversationId);
  const r = await ddb.query({
    TableName: MESSAGES_TABLE,
    KeyConditionExpression: "conversationId = :c",
    ExpressionAttributeValues: { ":c": normalizedId },
    ScanIndexForward: true,
    Limit: limit,
    ExclusiveStartKey: q.nextKey ? JSON.parse(q.nextKey) : undefined,
  });
  return json(200, C, {
    conversationId: normalizedId,
    messages: r.Items || [],
    nextKey: r.LastEvaluatedKey ? JSON.stringify(r.LastEvaluatedKey) : null,
  });
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







/* ------------ Routes ------------ */
const routes = [
  { m: "GET",   r: /^\/health$/i,                               h: health },

  // inbox & conversations
  { m: "GET",   r: /^\/inbox$/i,                                 h: getInbox },
  { m: "GET",   r: /^\/threads$/i,                               h: listThreads },
  { m: "GET",   r: /^\/threads\/(?<conversationId>[^/]+)$/i,     h: getConversation },

  // conversation messages
  { m: "GET",   r: /^\/threads\/(?<conversationId>[^/]+)\/messages$/i, h: listConversationMessages },

  // project messages (query param)
  { m: "GET",   r: /^\/$/i,                                        h: listProjectMessages },

  // project-scoped
  { m: "GET",   r: /^\/project\/(?<projectId>[^/]+)$/i,          h: listProjectMessages },

  // notifications (v1.2)
  { m: "GET",   r: /^\/notifications$/i,                         h: listNotifications },

  // v1.1 compat aliases
  { m: "GET",   r: /^\/getDirectMessages$/i,                                h: listConversationMessages },
  { m: "GET",   r: /^\/getDmInbox$/i,                                       h: getInbox },
  { m: "GET",   r: /^\/getProjectMessages$/i,                               h: listProjectMessages },
  { m: "GET",   r: /^\/getNotifications$/i,                                h: listNotifications },
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
      if (match) {
        // Decode any URL-encoded path parameters (e.g., conversationId with '#')
        const params = {};
        for (const [k, v] of Object.entries(match.groups || {})) {
          params[k] = decodeURIComponent(v);
        }
        return await h(event, CORS, params);
      }
    }
    return json(404, CORS, { error: "Not found", method, path });
  } catch (err) {
    console.error("messages_router_error", { method, path, err });
    const msg = err?.message || "Server error";
    const status = /ConditionalCheckFailed/i.test(msg) ? 409 : 500;
    return json(status, CORS, { error: msg });
  }
}
