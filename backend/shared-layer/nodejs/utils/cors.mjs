// /opt/nodejs/utils/cors.mjs

// ---- Config via env (with sensible defaults) ----
const DEFAULT_ORIGIN =
  process.env.CORS_DEFAULT_ORIGIN?.replace(/\/$/, "") || "http://localhost:3000";

// Comma-separated list of exact origins to allow (no trailing slashes)
const ENV_ALLOWED = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Defaults you likely always want in dev/prod
const DEFAULT_ALLOWED = [
  "http://localhost:3000",
  "http://192.168.1.200:3000",
];

const EXPLICIT_ALLOW = new Set([...ENV_ALLOWED, ...DEFAULT_ALLOWED]);

// Comma-separated base hosts allowed for wildcard subdomains
// e.g. "mylg.studio,staging.mylg.studio" → allows *.mylg.studio and *.staging.mylg.studio
const WILDCARD_HOSTS = (process.env.CORS_WILDCARD_HOSTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// "true" to send Access-Control-Allow-Credentials
const ALLOW_CREDENTIALS =
  String(process.env.CORS_ALLOW_CREDENTIALS || "false").toLowerCase() === "true";

// ---- Internals ----
function hostAllowed(hostname) {
  // exact base domain OR any subdomain of listed bases
  return WILDCARD_HOSTS.some(
    (base) => hostname === base || hostname.endsWith(`.${base}`)
  );
}

function pickAllowOrigin(reqOrigin) {
  if (!reqOrigin) return DEFAULT_ORIGIN;
  const normalized = String(reqOrigin).replace(/\/$/, "");
  if (EXPLICIT_ALLOW.has(normalized)) return normalized;

  try {
    const u = new URL(normalized);
    if (hostAllowed(u.hostname)) {
      // Keep scheme + host (preserves non-standard ports if any)
      return `${u.protocol}//${u.host}`;
    }
  } catch {
    // fall through on invalid URL
  }
  return DEFAULT_ORIGIN;
}

// ---- Public API ----
export function corsHeaders(origin) {
  const allowOrigin = pickAllowOrigin(origin);
  const base = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token, X-Amz-Date, X-Amz-Security-Token, X-Amz-User-Agent",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Expose-Headers": "Authorization,x-amzn-RequestId,x-amz-apigw-id",
    "Access-Control-Max-Age": "600",
  };
  if (ALLOW_CREDENTIALS) base["Access-Control-Allow-Credentials"] = "true";
  return base;
}

export function corsHeadersFromEvent(event) {
  const h = event?.headers || {};
  const origin = h.origin || h.Origin || h.ORIGIN || "";
  return corsHeaders(origin);
}

export function preflight(origin) {
  return { statusCode: 204, headers: corsHeaders(origin), body: "" };
}

export function preflightFromEvent(event) {
  return { statusCode: 204, headers: corsHeadersFromEvent(event), body: "" };
}

// Handy JSON response helper (keeps things consistent)
export function json(statusCode, headers, body) {
  return {
    statusCode: String(statusCode),
    headers: { ...headers, "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body ?? ""),
  };
}
