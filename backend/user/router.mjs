import {
  corsHeadersFromEvent,
  preflightFromEvent,
  json,
} from "/opt/nodejs/utils/cors.mjs";

// -------- utils --------
const m = (e) => e?.requestContext?.http?.method?.toUpperCase?.() || e?.httpMethod?.toUpperCase?.() || "GET";
const p = (e) => (e?.rawPath || e?.path || "/");
const q = (e) => e?.queryStringParameters || {};
const body = (e) => { try { return JSON.parse(e?.body || "{}"); } catch { return {}; } };

// ---- handlers (reuse your existing logic or paste it here) ----
async function getUserProfile(event, CORS, params) {
  const { userId } = params;
  if (!userId) return json(400, CORS, { error: "userId required" });
  return json(200, CORS, { user: { userId } });
}

async function getUserProfilesBatch(event, CORS) {
  const ids = (q(event).ids || "").split(",").map(s => s.trim()).filter(Boolean);
  if (!ids.length) return json(400, CORS, { error: "ids required (comma-separated)" });
  return json(200, CORS, { users: ids.map(userId => ({ userId })) });
}

async function patchUserProfile(event, CORS, params) {
  const { userId } = params;
  if (!userId) return json(400, CORS, { error: "userId required" });
  return json(200, CORS, { user: { userId, ...body(event) }, updated: true });
}

async function patchUserProfilePending(event, CORS, params) {
  const { userId } = params;
  if (!userId) return json(400, CORS, { error: "userId required" });
  return json(200, CORS, { pending: { userId, ...body(event) }, updated: true });
}

async function notifyRegisteredUserTeam(event, CORS) {
  return json(202, CORS, { queued: true, request: body(event) });
}

async function postProjectToUserId(event, CORS) {
  const b = body(event);
  const userId = q(event).userId || b.userId;
  if (!userId) return json(400, CORS, { error: "userId required (query or body)" });
  if (!b.projectId) return json(400, CORS, { error: "projectId required (body)" });
  return json(200, CORS, { userId, projectId: b.projectId, attached: true });
}

async function sendProjectInvitation(event, CORS) {
  return json(202, CORS, { sent: true, inviteId: "INV-PLACEHOLDER", request: body(event) });
}

async function listInvitesOutgoing(event, CORS) {
  const userId = q(event).userId;
  if (!userId) return json(400, CORS, { error: "userId required" });
  return json(200, CORS, { userId, invites: [] });
}

async function listInvitesIncoming(event, CORS) {
  const userId = q(event).userId;
  if (!userId) return json(400, CORS, { error: "userId required" });
  return json(200, CORS, { userId, invites: [] });
}

async function sendInvite(event, CORS)   { return json(201, CORS, { inviteId: "INV-SEND-PLACEHOLDER", request: body(event) }); }
async function acceptInvite(event, CORS) { return json(200, CORS, { accepted: true, request: body(event) }); }
async function declineInvite(event, CORS){ return json(200, CORS, { declined: true, request: body(event) }); }
async function cancelInvite(event, CORS) { return json(200, CORS, { canceled: true, request: body(event) }); }

async function sendUserInvite(event, CORS) {
  return json(202, CORS, { queued: true, request: body(event) });
}

async function health(_e, CORS) { return json(200, CORS, { ok: true }); }

// -------- route table (method + regex) --------
const routes = [
  { M: "GET",   R: /^\/userProfiles\/(?<userId>[^/]+)$/i,                     H: getUserProfile },
  { M: "GET",   R: /^\/userProfiles$/i,                                       H: getUserProfilesBatch },
  { M: "PATCH", R: /^\/userProfiles\/(?<userId>[^/]+)$/i,                     H: patchUserProfile },
  { M: "PATCH", R: /^\/userProfilesPending\/(?<userId>[^/]+)$/i,              H: patchUserProfilePending },
  { M: "POST",  R: /^\/RegisteredUserTeamNotification$/i,                     H: notifyRegisteredUserTeam },
  { M: "POST",  R: /^\/postProjectToUserId$/i,                                H: postProjectToUserId },
  { M: "POST",  R: /^\/sendProjectInvitation$/i,                              H: sendProjectInvitation },

  { M: "GET",   R: /^\/invites\/outgoing$/i,                                  H: listInvitesOutgoing },
  { M: "GET",   R: /^\/invites\/incoming$/i,                                  H: listInvitesIncoming },
  { M: "POST",  R: /^\/invites\/send$/i,                                      H: sendInvite },
  { M: "POST",  R: /^\/invites\/accept$/i,                                    H: acceptInvite },
  { M: "POST",  R: /^\/invites\/decline$/i,                                   H: declineInvite },
  { M: "POST",  R: /^\/invites\/cancel$/i,                                    H: cancelInvite },

  { M: "POST",  R: /^\/user-invites$/i,                                       H: sendUserInvite },

  { M: "GET",   R: /^\/user\/health$/i,                                       H: health },
];

// -------- entrypoint --------
export async function handler(event) {
  if (m(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const method = m(event);
  const path   = p(event);

  for (const { M, R, H } of routes) {
    if (M !== method) continue;
    const match = R.exec(path);
    if (match) return H(event, CORS, match.groups || {});
  }

  return json(404, CORS, { error: "Not found", method, path });
}
