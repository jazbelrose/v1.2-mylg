// backend/users/router.mjs
import { corsHeadersFromEvent, preflightFromEvent, json } from "/opt/nodejs/utils/cors.mjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

/* ---------- ENV ---------- */
const REGION = process.env.AWS_REGION || "us-west-2";
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || "UserProfiles";
const INVITES_TABLE = process.env.INVITES_TABLE || "UserInvites";
const INVITES_BY_SENDER_INDEX = process.env.INVITES_BY_SENDER_INDEX || "senderId-index";
const INVITES_BY_RECIPIENT_INDEX = process.env.INVITES_BY_RECIPIENT_INDEX || "recipientId-index";
const SCANS_ALLOWED = (process.env.SCANS_ALLOWED || "true").toLowerCase() === "true";

/* ---------- DDB ---------- */
const ddb = DynamoDBDocument.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

/* ---------- utils ---------- */
const M = (e) => e?.requestContext?.http?.method?.toUpperCase?.() || e?.httpMethod?.toUpperCase?.() || "GET";
const P = (e) => (e?.rawPath || e?.path || "/");
const Q = (e) => e?.queryStringParameters || {};
const B = (e) => { try { return JSON.parse(e?.body || "{}"); } catch { return {}; } };
const nowISO = () => new Date().toISOString();

function lowerEmail(s) { return (s || "").toLowerCase().trim(); }
function pendingKeyForEmail(email) { return `PENDING#${lowerEmail(email)}`; }

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

async function batchGetUsersByIds(ids) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  const out = [];
  for (const ch of chunks) {
    const r = await ddb.batchGet({
      RequestItems: {
        [USER_PROFILES_TABLE]: { Keys: ch.map((userId) => ({ userId })) },
      },
    });
    out.push(...(r.Responses?.[USER_PROFILES_TABLE] || []));
  }
  return out;
}

function withFirstNameFallback(u) {
  if (!u) return u;
  return { ...u, firstName: u.firstName || u.cognitoAttributes?.given_name || "" };
}

/* ---------- handlers ---------- */

// Health
async function health(_e, C) { return json(200, C, { ok: true, domain: "users" }); }

/* ======== USER PROFILES ======== */

// GET /userProfiles/{userId}
async function getUserProfile(_e, C, { userId }) {
  if (!userId) return json(400, C, { error: "userId required" });
  const r = await ddb.get({ TableName: USER_PROFILES_TABLE, Key: { userId } });
  return json(200, C, withFirstNameFallback(r.Item) || null);
}

// GET /userProfiles?ids=a,b,c  (batch)  OR (dev) GET /userProfiles (scan)
async function getUserProfiles(event, C) {
  const ids = (Q(event).ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length) {
    const users = await batchGetUsersByIds(ids);
    return json(200, C, { Items: users.map(withFirstNameFallback) });
  }

  if (!SCANS_ALLOWED) return json(400, C, { error: "ids required (comma-separated)" });

  const r = await ddb.scan({ TableName: USER_PROFILES_TABLE });
  return json(200, C, { Items: (r.Items || []).map(withFirstNameFallback) });
}

/* PUT /userProfiles  (v1.1 semantics)
   Body may contain:
     - userId or cognitoSub (required)
     - email (lowercased); if present, merge from pending key PENDING#<email> in the SAME table.
     - role default "user"
     - preserve existing `pending` boolean if not explicitly provided.
*/
async function putUserProfile(event, C) {
  const input = B(event);
  const table = USER_PROFILES_TABLE;

  let userId = input.userId || input.cognitoSub;
  if (!userId) return json(400, C, { error: "userId or cognitoSub required" });

  const email = lowerEmail(input.email);
  let item = { ...input, userId, role: input.role || "user" };

  // preserve existing pending if not provided
  if (typeof item.pending !== "boolean") {
    const existing = await ddb.get({ TableName: table, Key: { userId } });
    if (typeof existing.Item?.pending === "boolean") item.pending = existing.Item.pending;
  }

  // merge from PENDING#<email> (same table) if present
  if (email) {
    const pk = pendingKeyForEmail(email);
    const pending = await ddb.get({ TableName: table, Key: { userId: pk } });
    if (pending.Item) {
      // merge, keep pending flag from the pending item
      item = { ...pending.Item, ...item, userId, pending: pending.Item.pending };
      delete item.ttl;
      // delete the pending record
      await ddb.delete({ TableName: table, Key: { userId: pk } });
    }
  }

  await ddb.put({ TableName: table, Item: item });
  return json(200, C, { ok: true, Item: withFirstNameFallback(item) });
}

// PATCH /userProfiles/{userId}
async function patchUserProfile(event, C, { userId }) {
  if (!userId) return json(400, C, { error: "userId required" });
  const b = B(event);
  delete b.userId;

  const upd = buildUpdate({ ...b, updatedAt: nowISO() });
  if (!upd) return json(400, C, { error: "No fields to update" });

  const r = await ddb.update({
    TableName: USER_PROFILES_TABLE,
    Key: { userId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });
  return json(200, C, withFirstNameFallback(r.Attributes));
}

// DELETE /userProfiles/{userId}
async function deleteUserProfile(_e, C, { userId }) {
  if (!userId) return json(400, C, { error: "userId required" });
  await ddb.delete({ TableName: USER_PROFILES_TABLE, Key: { userId } });
  return json(204, C, "");
}

/* Optional: write a "pending profile" into the SAME table using PENDING#<email>.
   PATCH /userProfilesPending/{email}
   Body: any fields (e.g., onboarding info), plus optional { ttl: <epochSeconds> } for expiration.
*/
async function patchUserProfilePending(event, C, { email }) {
  const e = lowerEmail(email);
  if (!e) return json(400, C, { error: "email required in path" });
  const pk = pendingKeyForEmail(e);
  const b = B(event);
  delete b.userId; // key is the pending composite

  const ts = nowISO();
  const item = {
    userId: pk,
    email: e,
    pending: true,
    updatedAt: ts,
    createdAt: b.createdAt || ts,
    ...b,
  };
  await ddb.put({ TableName: USER_PROFILES_TABLE, Item: item });
  return json(200, C, { pending: item });
}

/* ======== INVITES ======== */

// POST /sendProjectInvitation  (specialized)
async function sendProjectInvitation(event, C) {
  const b = B(event);
  const inviteId = b.inviteId || `INV-${uuidv4()}`;
  const ts = nowISO();

  const item = {
    inviteId,
    type: "project",
    senderId: b.senderId,
    recipientId: b.recipientId,
    recipientEmail: lowerEmail(b.recipientEmail),
    projectId: b.projectId,
    status: "sent",
    createdAt: ts,
    updatedAt: ts,
    meta: b.meta || {},
  };

  if (!item.senderId) return json(400, C, { error: "senderId required" });
  if (!item.projectId) return json(400, C, { error: "projectId required" });
  if (!item.recipientId && !item.recipientEmail) {
    return json(400, C, { error: "recipientId or recipientEmail required" });
  }

  await ddb.put({
    TableName: INVITES_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(inviteId)",
  });
  return json(201, C, { invite: item });
}

// GET /invites/outgoing?userId=...
async function listInvitesOutgoing(event, C) {
  const userId = Q(event).userId;
  if (!userId) return json(400, C, { error: "userId required" });

  const r = await ddb.query({
    TableName: INVITES_TABLE,
    IndexName: INVITES_BY_SENDER_INDEX,
    KeyConditionExpression: "senderId = :s",
    ExpressionAttributeValues: { ":s": userId },
    ScanIndexForward: false,
  });
  return json(200, C, { userId, invites: r.Items || [] });
}

// GET /invites/incoming?userId=...
async function listInvitesIncoming(event, C) {
  const userId = Q(event).userId;
  if (!userId) return json(400, C, { error: "userId required" });

  const r = await ddb.query({
    TableName: INVITES_TABLE,
    IndexName: INVITES_BY_RECIPIENT_INDEX,
    KeyConditionExpression: "recipientId = :r",
    ExpressionAttributeValues: { ":r": userId },
    ScanIndexForward: false,
  });
  return json(200, C, { userId, invites: r.Items || [] });
}

// POST /invites/send  (generic)
async function sendInvite(event, C) {
  const b = B(event);
  const inviteId = b.inviteId || `INV-${uuidv4()}`;
  const ts = nowISO();

  const item = {
    inviteId,
    type: b.type || "project",
    senderId: b.senderId,
    recipientId: b.recipientId,
    recipientEmail: lowerEmail(b.recipientEmail),
    projectId: b.projectId,
    status: "sent",
    createdAt: ts,
    updatedAt: ts,
    meta: b.meta || {},
  };

  if (!item.senderId) return json(400, C, { error: "senderId required" });
  if (!item.recipientId && !item.recipientEmail)
    return json(400, C, { error: "recipientId or recipientEmail required" });

  await ddb.put({
    TableName: INVITES_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(inviteId)",
  });

  return json(201, C, { invite: item });
}

async function setInviteStatus(event, C, status) {
  const b = B(event);
  const inviteId = b.inviteId;
  if (!inviteId) return json(400, C, { error: "inviteId required in body" });

  const upd = buildUpdate({ status, updatedAt: nowISO() });
  const r = await ddb.update({
    TableName: INVITES_TABLE,
    Key: { inviteId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });
  return json(200, C, { invite: r.Attributes });
}
const acceptInvite  = (e, C) => setInviteStatus(e, C, "accepted");
const declineInvite = (e, C) => setInviteStatus(e, C, "declined");
const cancelInvite  = (e, C) => setInviteStatus(e, C, "canceled");

/* ======== PROJECT -> USER LINK ======== */

// POST /postProjectToUserId  (attach projectId to user.projects[])
async function postProjectToUserId(event, C) {
  const b = B(event);
  const userId = Q(event).userId || b.userId;
  if (!userId) return json(400, C, { error: "userId required (query or body)" });
  if (!b.projectId) return json(400, C, { error: "projectId required (body)" });

  const current = await ddb.get({
    TableName: USER_PROFILES_TABLE,
    Key: { userId },
    ProjectionExpression: "projects",
  });
  const existing = Array.isArray(current.Item?.projects) ? current.Item.projects : [];
  if (!existing.includes(b.projectId)) existing.push(b.projectId);

  const r = await ddb.update({
    TableName: USER_PROFILES_TABLE,
    Key: { userId },
    UpdateExpression: "SET #projects = :p, #updatedAt = :u",
    ExpressionAttributeNames: { "#projects": "projects", "#updatedAt": "updatedAt" },
    ExpressionAttributeValues: { ":p": existing, ":u": nowISO() },
    ReturnValues: "ALL_NEW",
  });

  return json(200, C, { userId, projectId: b.projectId, projects: r.Attributes.projects || [] });
}

/* ---------- routes ---------- */
const routes = [
  { M: "GET",    R: /^\/user\/health$/i,                                        H: health },

  // user profiles
  { M: "GET",    R: /^\/userProfiles\/(?<userId>[^/]+)$/i,                      H: getUserProfile },
  { M: "GET",    R: /^\/userProfiles$/i,                                        H: getUserProfiles },
  { M: "PUT",    R: /^\/userProfiles$/i,                                        H: putUserProfile },            // v1.1 upsert
  { M: "PATCH",  R: /^\/userProfiles\/(?<userId>[^/]+)$/i,                      H: patchUserProfile },
  { M: "DELETE", R: /^\/userProfiles\/(?<userId>[^/]+)$/i,                      H: deleteUserProfile },

  // pending (same table; key=PENDING#<email>)
  { M: "PATCH",  R: /^\/userProfilesPending\/(?<email>[^/]+)$/i,                H: patchUserProfilePending },

  // invites
  { M: "POST",   R: /^\/sendProjectInvitation$/i,                               H: sendProjectInvitation },
  { M: "GET",    R: /^\/invites\/outgoing$/i,                                   H: listInvitesOutgoing },
  { M: "GET",    R: /^\/invites\/incoming$/i,                                   H: listInvitesIncoming },
  { M: "POST",   R: /^\/invites\/send$/i,                                       H: sendInvite },
  { M: "POST",   R: /^\/invites\/accept$/i,                                     H: acceptInvite },
  { M: "POST",   R: /^\/invites\/decline$/i,                                    H: declineInvite },
  { M: "POST",   R: /^\/invites\/cancel$/i,                                     H: cancelInvite },

  // project link
  { M: "POST",   R: /^\/postProjectToUserId$/i,                                 H: postProjectToUserId },
];

/* ---------- entry ---------- */
export async function handler(event) {
  if (M(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const method = M(event);
  const path   = P(event);

  try {
    for (const { M: mth, R, H } of routes) {
      if (mth !== method) continue;
      const match = R.exec(path);
      if (match) return await H(event, CORS, match.groups || {});
    }
    return json(404, CORS, { error: "Not found", method, path });
  } catch (err) {
    console.error("users_router_error", { method, path, err });
    const msg = err?.message || "Server error";
    const status = /ConditionalCheckFailed/i.test(msg) ? 409 : 500;
    return json(status, CORS, { error: msg });
  }
}
