// backend/newsletter/router.mjs
import { corsHeadersFromEvent, preflightFromEvent, json } from "/opt/nodejs/utils/cors.mjs";
import { SNSClient, SubscribeCommand, PublishCommand } from "@aws-sdk/client-sns";

/* ---------- ENV ---------- */
const REGION = process.env.AWS_REGION || "us-west-2";
const NEWSLETTER_TOPIC_ARN = process.env.NEWSLETTER_TOPIC_ARN || "";

/* ---------- SNS ---------- */
const sns = new SNSClient({ region: REGION });

/* ---------- utils ---------- */
const M = (e) => e?.requestContext?.http?.method?.toUpperCase?.() || e?.httpMethod?.toUpperCase?.() || "GET";
const P = (e) => (e?.rawPath || e?.path || "/");
const B = (e) => { try { return JSON.parse(e?.body || "{}"); } catch { return {}; } };

/* ---------- handlers ---------- */
async function subscribe(event, C) {
  const { email } = B(event);
  if (!email) return json(400, C, { error: "email required" });
  await sns.send(new SubscribeCommand({
    TopicArn: NEWSLETTER_TOPIC_ARN,
    Protocol: "email",
    Endpoint: email,
  }));
  return json(200, C, { ok: true, email });
}

async function notify(event, C) {
  const { subject, message } = B(event);
  if (!subject || !message) return json(400, C, { error: "subject and message required" });
  await sns.send(new PublishCommand({
    TopicArn: NEWSLETTER_TOPIC_ARN,
    Subject: subject,
    Message: message,
  }));
  return json(200, C, { ok: true });
}

/* ---------- routes ---------- */
const routes = [
  { M: "POST", R: /^\/newsletter\/subscribe$/i, H: subscribe },
  { M: "POST", R: /^\/newsletter\/notify$/i, H: notify },
];

/* ---------- entry ---------- */
export async function handler(event) {
  if (M(event) === "OPTIONS") return preflightFromEvent(event);
  const CORS = corsHeadersFromEvent(event);
  const method = M(event);
  const path = P(event);
  try {
    for (const { M: mth, R, H } of routes) {
      if (mth !== method) continue;
      const match = R.exec(path);
      if (match) return await H(event, CORS, match.groups || {});
    }
    return json(404, CORS, { error: "Not found", method, path });
  } catch (err) {
    console.error("newsletter_router_error", { method, path, err });
    const msg = err?.message || "Server error";
    return json(500, CORS, { error: msg });
  }
}
