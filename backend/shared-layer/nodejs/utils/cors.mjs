// /opt/nodejs/utils/cors.mjs (inside the Layer)
const ALLOWED = (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean);

export function corsHeaders(origin) {
  const allow = ALLOWED.length === 0 || (origin && ALLOWED.includes(origin));
  return {
    "Access-Control-Allow-Origin": allow ? origin ?? "*" : "",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function preflight(origin) {
  return { statusCode: 200, headers: corsHeaders(origin), body: "" };
}
