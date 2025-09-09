import { corsHeadersFromEvent, preflightFromEvent, json } from "/opt/nodejs/utils/cors.mjs";

const M = (e) => e?.requestContext?.http?.method?.toUpperCase?.() || e?.httpMethod?.toUpperCase?.() || "GET";
const P = (e) => (e?.rawPath || e?.path || "/");
const Q = (e) => e?.queryStringParameters || {};
const B = (e) => { try { return JSON.parse(e?.body || "{}"); } catch { return {}; } };

// ---- Handlers (placeholders) ----
const health = async (_e, C) => json(200, C, { ok: true, domain: "messages" });

// Inbox / threads
const getInbox      = async (_e, C) => json(200, C, { inbox: [] });
const listThreads   = async (_e, C) => json(200, C, { threads: [] });
const createThread  = async (e, C) => json(201, C, { thread: { id: "THREAD-PLACEHOLDER", ...B(e) } });
const getThread     = async (_e, C, { threadId }) => json(200, C, { thread: { id: threadId } });

// Thread messages
const listThreadMessages = async (_e, C, { threadId }) => json(200, C, { threadId, messages: [] });
const postThreadMessage  = async (e, C, { threadId }) => json(201, C, { threadId, message: { id: "MSG-PLACEHOLDER", ...B(e) } });

// Individual message ops
const patchMessage  = async (e, C, { messageId }) => json(200, C, { message: { id: messageId, ...B(e) } });
const deleteMessage = async (_e, C, { messageId }) => json(204, C, "");

// Project-scoped messages (optional pattern)
const listProjectMessages = async (_e, C, { projectId }) => json(200, C, { projectId, messages: [] });
const postProjectMessage  = async (e, C, { projectId }) => json(201, C, { projectId, message: { id: "MSG-PLACEHOLDER", ...B(e) } });

// ---- Route table ----
const routes = [
  { m: "GET",   r: /^\/messages\/health$/i,                               h: health },

  { m: "GET",   r: /^\/messages\/inbox$/i,                                 h: getInbox },
  { m: "GET",   r: /^\/messages\/threads$/i,                               h: listThreads },
  { m: "POST",  r: /^\/messages\/threads$/i,                               h: createThread },
  { m: "GET",   r: /^\/messages\/threads\/(?<threadId>[^/]+)$/i,           h: getThread },

  { m: "GET",   r: /^\/messages\/threads\/(?<threadId>[^/]+)\/messages$/i, h: listThreadMessages },
  { m: "POST",  r: /^\/messages\/threads\/(?<threadId>[^/]+)\/messages$/i, h: postThreadMessage },

  { m: "PATCH", r: /^\/messages\/messages\/(?<messageId>[^/]+)$/i,         h: patchMessage },
  { m: "DELETE",r: /^\/messages\/messages\/(?<messageId>[^/]+)$/i,         h: deleteMessage },

  // Optional project-scoped routes under /messages
  { m: "GET",   r: /^\/messages\/project\/(?<projectId>[^/]+)$/i,          h: listProjectMessages },
  { m: "POST",  r: /^\/messages\/project\/(?<projectId>[^/]+)$/i,          h: postProjectMessage },
];

export async function handler(event) {
  if (M(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const method = M(event);
  const path = P(event);

  for (const { m, r, h } of routes) {
    if (m !== method) continue;
    const match = r.exec(path);
    if (match) return h(event, CORS, match.groups || {});
  }
  return json(404, CORS, { error: "Not found", method, path });
}
