import { corsHeaders, preflight } from "utils/cors.mjs";

const routes = {
  "POST /auth/login": async (e) => ({ statusCode: 200, body: JSON.stringify({ ok: true }) }),
  "POST /auth/refresh": async (e) => ({ statusCode: 200, body: JSON.stringify({ token: "..." }) }),
  "POST /auth/logout": async (e) => ({ statusCode: 200, body: JSON.stringify({ ok: true }) }),
  "GET /auth/me": async (e) => ({ statusCode: 200, body: JSON.stringify({ user: "..." }) }),
  // add more auth routes as needed
};

function method(e) { return e?.requestContext?.http?.method || e?.httpMethod || "GET"; }
function path(e) { return (e?.rawPath || e?.path || "/").toLowerCase(); }
function origin(e) { return e?.headers?.origin || e?.headers?.Origin || ""; }

export const handler = async (event) => {
  const m = method(event);
  const p = path(event);
  const o = origin(event);
  if (m === "OPTIONS") return preflight(o);

  // normalize to /auth/... for this router
  const key = `${m} ${p}`;
  const fn = routes[key];
  if (!fn) {
    return { statusCode: 404, headers: corsHeaders(o), body: JSON.stringify({ error: "Not found" }) };
  }

  try {
    const res = await fn(event);
    return { ...res, headers: { ...(res.headers || {}), ...corsHeaders(o) } };
  } catch (err) {
    console.error("auth_router_error", { key, err });
    return { statusCode: 500, headers: corsHeaders(o), body: JSON.stringify({ error: "Server error" }) };
  }
};
