import { corsHeaders, preflight } from "utils/cors.mjs";

const routes = {
  "GET /messages/conversations": async (e) => ({ statusCode: 200, body: JSON.stringify({ conversations: [] }) }),
  "POST /messages/conversations": async (e) => ({ statusCode: 201, body: JSON.stringify({ conversation: { id: "..." } }) }),
  "GET /messages/conversations/{id}": async (e) => ({ statusCode: 200, body: JSON.stringify({ conversation: { id: "..." } }) }),
  "GET /messages/conversations/{id}/messages": async (e) => ({ statusCode: 200, body: JSON.stringify({ messages: [] }) }),
  "POST /messages/conversations/{id}/messages": async (e) => ({ statusCode: 201, body: JSON.stringify({ message: { id: "..." } }) }),
  "PATCH /messages/{id}": async (e) => ({ statusCode: 200, body: JSON.stringify({ message: { id: "..." } }) }),
  "DELETE /messages/{id}": async (e) => ({ statusCode: 204, body: "" }),
  // add more message routes as needed
};

function method(e) { return e?.requestContext?.http?.method || e?.httpMethod || "GET"; }
function path(e) { return (e?.rawPath || e?.path || "/").toLowerCase(); }
function origin(e) { return e?.headers?.origin || e?.headers?.Origin || ""; }

export const handler = async (event) => {
  const m = method(event);
  const p = path(event);
  const o = origin(event);
  if (m === "OPTIONS") return preflight(o);

  // normalize to /messages/... for this router
  const key = `${m} ${p}`;
  const fn = routes[key];
  if (!fn) {
    return { statusCode: 404, headers: corsHeaders(o), body: JSON.stringify({ error: "Not found" }) };
  }

  try {
    const res = await fn(event);
    return { ...res, headers: { ...(res.headers || {}), ...corsHeaders(o) } };
  } catch (err) {
    console.error("messages_router_error", { key, err });
    return { statusCode: 500, headers: corsHeaders(o), body: JSON.stringify({ error: "Server error" }) };
  }
};
