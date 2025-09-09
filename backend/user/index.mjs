// backend/users/index.mjs
import {
  corsHeadersFromEvent,
  preflightFromEvent,
  json,
} from "/opt/nodejs/utils/cors.mjs";

const method = (e) =>
  e?.requestContext?.http?.method?.toUpperCase?.() ||
  e?.httpMethod?.toUpperCase?.() ||
  "GET";

const qs = (e) => e?.queryStringParameters || {};

const parseBody = (e) => {
  try { return JSON.parse(e?.body || "{}"); } catch { return {}; }
};

/* ---------------------------
   USER PROFILES (main)
   /userProfiles, /userProfiles/{userId}
----------------------------*/

/** GET /userProfiles/{userId}  → fetchUserProfile */
export async function getUserProfile(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const userId = event?.pathParameters?.userId;
  if (!userId) return json(400, CORS, { error: "userId required" });
  return json(200, CORS, { user: { userId } });
}

/** GET /userProfiles?ids=a,b,c  → fetchUserProfilesBatch */
export async function getUserProfilesBatch(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const ids = (qs(event).ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!ids.length) return json(400, CORS, { error: "ids required (comma-separated)" });
  return json(200, CORS, { users: ids.map((userId) => ({ userId })) });
}

/** PATCH /userProfiles/{userId}  → updateUserProfile */
export async function patchUserProfile(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const userId = event?.pathParameters?.userId;
  if (!userId) return json(400, CORS, { error: "userId required" });
  const body = parseBody(event);
  return json(200, CORS, { user: { userId, ...body }, updated: true });
}

/* ------------------------------------
   USER PROFILES (pending during signup)
   /userProfilesPending/{userId}
-------------------------------------*/

/** PATCH /userProfilesPending/{userId} → updateUserProfilePending */
export async function patchUserProfilePending(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const userId = event?.pathParameters?.userId;
  if (!userId) return json(400, CORS, { error: "userId required" });
  const body = parseBody(event);
  return json(200, CORS, { pending: { userId, ...body }, updated: true });
}

/* ---------------------------------
   REGISTERED USER TEAM NOTIFICATION
   /RegisteredUserTeamNotification
----------------------------------*/

/** POST /RegisteredUserTeamNotification */
export async function notifyRegisteredUserTeam(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const body = parseBody(event); // e.g., { userId, teamIds }
  return json(202, CORS, { queued: true, request: body });
}

/* -------------------------------
   POST PROJECT → USER ASSIGNMENT
   /postProjectToUserId?userId=...   (body: { projectId })
-------------------------------*/

/** POST /postProjectToUserId?userId=... */
export async function postProjectToUserId(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const userId = qs(event).userId || parseBody(event).userId;
  const { projectId } = parseBody(event);
  if (!userId) return json(400, CORS, { error: "userId required (query or body)" });
  if (!projectId) return json(400, CORS, { error: "projectId required (body)" });
  return json(200, CORS, { userId, projectId, attached: true });
}

/* -----------------------
   PROJECT INVITATIONS API
   /sendProjectInvitation
------------------------*/

/** POST /sendProjectInvitation */
export async function sendProjectInvitation(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const body = parseBody(event); // { projectId, toUserId, role?, note? }
  return json(202, CORS, { sent: true, inviteId: "INV-PLACEHOLDER", request: body });
}

/* -------------------------
   COLLAB INVITES BASE (/invites)
   - GET  /invites/outgoing?userId=...
   - GET  /invites/incoming?userId=...
   - POST /invites/send
   - POST /invites/accept
   - POST /invites/decline
   - POST /invites/cancel
--------------------------*/

export async function listInvitesOutgoing(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const userId = qs(event).userId;
  if (!userId) return json(400, CORS, { error: "userId required" });
  return json(200, CORS, { userId, invites: [] });
}

export async function listInvitesIncoming(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const userId = qs(event).userId;
  if (!userId) return json(400, CORS, { error: "userId required" });
  return json(200, CORS, { userId, invites: [] });
}

export async function sendInvite(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const body = parseBody(event); // { fromUserId, toUserId, projectId, role? }
  return json(201, CORS, { inviteId: "INV-SEND-PLACEHOLDER", request: body });
}

export async function acceptInvite(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const body = parseBody(event); // { inviteId, userId }
  return json(200, CORS, { accepted: true, request: body });
}

export async function declineInvite(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const body = parseBody(event); // { inviteId, userId }
  return json(200, CORS, { declined: true, request: body });
}

export async function cancelInvite(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const body = parseBody(event); // { inviteId, byUserId }
  return json(200, CORS, { canceled: true, request: body });
}

/* --------------------------
   USER INVITES (email send)
   /user-invites   (placeholder)
---------------------------*/

/** POST /user-invites  → placeholder email sender */
export async function sendUserInvite(event) {
  if (method(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const body = parseBody(event); // { toEmail, message?, meta? }
  return json(202, CORS, { queued: true, request: body });
}
