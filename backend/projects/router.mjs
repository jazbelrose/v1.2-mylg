// backend/projects/router.mjs
import { corsHeadersFromEvent, preflightFromEvent, json } from "/opt/nodejs/utils/cors.mjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

// ----- ENV (configure in serverless.yml) -----
const REGION = process.env.AWS_REGION || "us-west-2";

// Core projects table (your "Projects DB")
const PROJECTS_TABLE = process.env.PROJECTS_TABLE || "Projects";

// Optional split tables (recommended)
const TASKS_TABLE   = process.env.TASKS_TABLE   || "ProjectTasks";
const EVENTS_TABLE  = process.env.EVENTS_TABLE  || "ProjectEvents";

// Optional index to accelerate schedule queries by start time (partitioned by projectId)
const EVENTS_STARTAT_INDEX = process.env.EVENTS_STARTAT_INDEX || ""; // e.g. "projectId-startAt-index"

// Allow fallback scans when an index is not present (dev only)
const SCANS_ALLOWED = (process.env.SCANS_ALLOWED || "true").toLowerCase() === "true";

// ----- DDB client -----
const ddb = DynamoDBDocument.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

// ----- helpers -----
const M = (e) => e?.requestContext?.http?.method?.toUpperCase?.() || e?.httpMethod?.toUpperCase?.() || "GET";
const P = (e) => (e?.rawPath || e?.path || "/");
const Q = (e) => e?.queryStringParameters || {};
const B = (e) => { try { return JSON.parse(e?.body || "{}"); } catch { return {}; } };

function nowISO() { return new Date().toISOString(); }

// Create an eventId that sorts by time descending with ScanIndexForward=false
function makeEventId(ts = Date.now()) {
  // zero-padded millis so lexical order = time order
  const pad = String(ts).padStart(13, "0");
  return `E#${pad}#${uuidv4()}`;
}

// build UPDATE expressions from a partial object
function buildUpdate(obj) {
  const Names = {};
  const Values = {};
  const sets = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    Names["#" + k] = k;
    Values[":" + k] = v;
    sets.push(`#${k} = :${k}`);
  }
  if (sets.length === 0) return null;
  return {
    UpdateExpression: "SET " + sets.join(", "),
    ExpressionAttributeNames: Names,
    ExpressionAttributeValues: Values,
  };
}

// =================== Handlers ===================

// ---- Health
const health = async (_e, C) => json(200, C, { ok: true, domain: "projects" });

// ---- Projects CRUD (PROJECTS_TABLE: PK = projectId)
const listProjects = async (e, C) => {
  const q = Q(e);
  const limit = Math.min(parseInt(q.limit || "50", 10), 200);

  // Prefer filtered scan unless you’ve created GSIs.
  // Example filters supported: ownerId, status
  const filters = [];
  const names = {};
  const values = {};
  if (q.ownerId) { names["#ownerId"] = "ownerId"; values[":ownerId"] = q.ownerId; filters.push("#ownerId = :ownerId"); }
  if (q.status)  { names["#status"]  = "status";  values[":status"]  = q.status;  filters.push("#status = :status"); }

  if (filters.length === 0 && !SCANS_ALLOWED) {
    return json(400, C, { error: "Provide a filter (ownerId/status) or enable SCANS_ALLOWED=true" });
  }

  const params = { TableName: PROJECTS_TABLE, Limit: limit };
  if (filters.length) {
    params.FilterExpression = filters.join(" AND ");
    params.ExpressionAttributeNames = names;
    params.ExpressionAttributeValues = values;
  }

  const r = await ddb.scan(params);
  return json(200, C, { items: r.Items || [], count: r.Count ?? 0, scannedCount: r.ScannedCount ?? 0, lastKey: r.LastEvaluatedKey || null });
};

const createProject = async (e, C) => {
  const body = B(e);
  const projectId = body.projectId || `P-${uuidv4()}`;
  const ts = nowISO();

  const item = {
    projectId,
    title: body.title || "",
    status: body.status || "new",
    team: body.team || [],
    color: body.color,
    description: body.description,
    clientName: body.clientName,
    clientEmail: body.clientEmail,
    clientPhone: body.clientPhone,
    previewUrl: body.previewUrl,
    quickLinks: body.quickLinks || [],
    thumbnails: body.thumbnails || [],
    dateCreated: ts,
    updatedAt: ts,
  };

  await ddb.put({
    TableName: PROJECTS_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(projectId)",
  });

  return json(201, C, item);
};

const getProject = async (_e, C, { projectId }) => {
  const r = await ddb.get({ TableName: PROJECTS_TABLE, Key: { projectId } });
  return json(200, C, r.Item || null);
};

const patchProject = async (e, C, { projectId }) => {
  const body = B(e);
  const upd = buildUpdate({ ...body, updatedAt: nowISO() });
  if (!upd) return json(400, C, { error: "No fields to update" });

  const r = await ddb.update({
    TableName: PROJECTS_TABLE,
    Key: { projectId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });
  return json(200, C, r.Attributes);
};

const deleteProject = async (_e, C, { projectId }) => {
  await ddb.delete({ TableName: PROJECTS_TABLE, Key: { projectId } });
  return json(204, C, "");
};

// ---- Team (team lives on PROJECTS_TABLE as an array)
const getTeam = async (_e, C, { projectId }) => {
  const r = await ddb.get({ TableName: PROJECTS_TABLE, Key: { projectId }, ProjectionExpression: "projectId, team" });
  const team = r.Item?.team || [];
  return json(200, C, { projectId, team });
};

const addTeam = async (e, C, { projectId }) => {
  const body = B(e);
  // body can be { userId, role, ... } or an array of members; we append
  const members = Array.isArray(body) ? body : [body];
  const r = await ddb.update({
    TableName: PROJECTS_TABLE,
    Key: { projectId },
    UpdateExpression: "SET #team = list_append(if_not_exists(#team, :empty), :m), #updatedAt = :ts",
    ExpressionAttributeNames: { "#team": "team", "#updatedAt": "updatedAt" },
    ExpressionAttributeValues: { ":m": members, ":empty": [], ":ts": nowISO() },
    ReturnValues: "ALL_NEW",
  });
  return json(201, C, { projectId, team: r.Attributes.team || [] });
};

const removeTeam = async (_e, C, { projectId, userId }) => {
  // fetch → filter → write back (without scan)
  const r = await ddb.get({ TableName: PROJECTS_TABLE, Key: { projectId }, ProjectionExpression: "team" });
  const team = (r.Item?.team || []).filter((m) => m?.userId !== userId);
  await ddb.update({
    TableName: PROJECTS_TABLE,
    Key: { projectId },
    UpdateExpression: "SET #team = :team, #updatedAt = :ts",
    ExpressionAttributeNames: { "#team": "team", "#updatedAt": "updatedAt" },
    ExpressionAttributeValues: { ":team": team, ":ts": nowISO() },
  });
  return json(200, C, { projectId, removedUserId: userId, team });
};

// ---- Tasks (TASKS_TABLE: PK=projectId, SK=taskId)
const listTasks = async (_e, C, { projectId }) => {
  const r = await ddb.query({
    TableName: TASKS_TABLE,
    KeyConditionExpression: "projectId = :p",
    ExpressionAttributeValues: { ":p": projectId },
  });
  return json(200, C, { projectId, tasks: r.Items || [] });
};

const createTask = async (e, C, { projectId }) => {
  const body = B(e);
  const taskId = body.taskId || `T-${uuidv4()}`;
  const ts = nowISO();
  const item = {
    projectId,
    taskId,
    title: body.title || "",
    status: body.status || "todo",
    assigneeId: body.assigneeId,
    dueAt: body.dueAt,
    createdAt: ts,
    updatedAt: ts,
    ...body,
  };
  await ddb.put({
    TableName: TASKS_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(projectId) AND attribute_not_exists(taskId)",
  });
  return json(201, C, { projectId, task: item });
};

const getTask = async (_e, C, { projectId, taskId }) => {
  const r = await ddb.get({ TableName: TASKS_TABLE, Key: { projectId, taskId } });
  return json(200, C, r.Item || null);
};

const patchTask = async (e, C, { projectId, taskId }) => {
  const body = B(e);
  const upd = buildUpdate({ ...body, updatedAt: nowISO() });
  if (!upd) return json(400, C, { error: "No fields to update" });
  const r = await ddb.update({
    TableName: TASKS_TABLE,
    Key: { projectId, taskId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });
  return json(200, C, r.Attributes);
};

const deleteTask = async (_e, C, { projectId, taskId }) => {
  await ddb.delete({ TableName: TASKS_TABLE, Key: { projectId, taskId } });
  return json(204, C, "");
};

// ---- Events (EVENTS_TABLE: PK=projectId, SK=eventId; unified timeline/schedule)
const listEvents = async (e, C, { projectId }) => {
  const q = Q(e);
  const view = (q.view || "timeline").toLowerCase();
  const fromISO = q.from || null;
  const toISO   = q.to || null;
  const kinds = (q.kind || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // base query by projectId
  let items = [];
  if (view === "schedule" && EVENTS_STARTAT_INDEX) {
    // Query by startAt range using GSI if provided
    const values = { ":p": projectId };
    let cond = "projectId = :p";

    // add between filter on startAt in KeyCondition when possible
    if (fromISO && toISO) {
      cond += " AND #startAt BETWEEN :from AND :to";
      values[":from"] = fromISO;
      values[":to"] = toISO;
    } else if (fromISO) {
      cond += " AND #startAt >= :from";
      values[":from"] = fromISO;
    } else if (toISO) {
      cond += " AND #startAt <= :to";
      values[":to"] = toISO;
    } else {
      // fall back to full partition scan on index
      // (KeyCondition still requires projectId; startAt condition omitted)
    }

    const r = await ddb.query({
      TableName: EVENTS_TABLE,
      IndexName: EVENTS_STARTAT_INDEX,
      KeyConditionExpression: cond,
      ExpressionAttributeNames: { "#startAt": "startAt" },
      ExpressionAttributeValues: values,
      ScanIndexForward: true, // chronological
    });
    items = r.Items || [];
  } else {
    // timeline: query partition and sort descending by eventId (E#<millis>#uuid)
    const r = await ddb.query({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "projectId = :p",
      ExpressionAttributeValues: { ":p": projectId },
      ScanIndexForward: false, // newest first (because eventId includes timestamp prefix)
    });
    items = r.Items || [];
  }

  // optional kind filter (in-memory; add GSI if you need server-side)
  if (kinds.length) {
    items = items.filter((ev) => ev?.kind && kinds.includes(ev.kind));
  }

  return json(200, C, { projectId, view, events: items });
};

const createEvent = async (e, C, { projectId }) => {
  const body = B(e);
  const tsMillis = Date.now();
  const eventId = body.eventId || makeEventId(tsMillis);
  const ts = body.ts || new Date(tsMillis).toISOString();

  const item = {
    projectId,
    eventId,
    ts,                        // canonical timestamp for timeline views
    kind: body.kind || "note", // status|milestone|meeting|audit|...
    title: body.title || "",
    description: body.description,
    startAt: body.startAt,     // for schedule views (optional)
    endAt: body.endAt,
    actorId: body.actorId,
    tags: body.tags || [],
    meta: body.meta || {},
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  await ddb.put({
    TableName: EVENTS_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(projectId) AND attribute_not_exists(eventId)",
  });

  return json(201, C, { projectId, event: item });
};

const getEvent = async (_e, C, { projectId, eventId }) => {
  const r = await ddb.get({ TableName: EVENTS_TABLE, Key: { projectId, eventId } });
  return json(200, C, r.Item || null);
};

const patchEvent = async (e, C, { projectId, eventId }) => {
  const body = B(e);
  const upd = buildUpdate({ ...body, updatedAt: nowISO() });
  if (!upd) return json(400, C, { error: "No fields to update" });
  const r = await ddb.update({
    TableName: EVENTS_TABLE,
    Key: { projectId, eventId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });
  return json(200, C, r.Attributes);
};

const deleteEvent = async (_e, C, { projectId, eventId }) => {
  await ddb.delete({ TableName: EVENTS_TABLE, Key: { projectId, eventId } });
  return json(204, C, "");
};

// Back-compat: /timeline → events(view=timeline)
const getTimeline = (e, C, g) => {
  const e2 = { ...e, queryStringParameters: { ...(Q(e) || {}), view: "timeline" } };
  return listEvents(e2, C, g);
};
const addTimeline = createEvent;
const patchTimeline = patchEvent;
const deleteTimeline = deleteEvent;

// =================== Routes ===================
const routes = [
  { m: "GET",    r: /^\/projects\/health$/i,                                                    h: health },

  // Projects
  { m: "GET",    r: /^\/projects$/i,                                                            h: listProjects },
  { m: "POST",   r: /^\/projects$/i,                                                            h: createProject },
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)$/i,                                       h: getProject },
  { m: "PATCH",  r: /^\/projects\/(?<projectId>[^/]+)$/i,                                       h: patchProject },
  { m: "DELETE", r: /^\/projects\/(?<projectId>[^/]+)$/i,                                       h: deleteProject },

  // Team
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/team$/i,                                 h: getTeam },
  { m: "POST",   r: /^\/projects\/(?<projectId>[^/]+)\/team$/i,                                 h: addTeam },
  { m: "DELETE", r: /^\/projects\/(?<projectId>[^/]+)\/team\/(?<userId>[^/]+)$/i,               h: removeTeam },

  // Events (unified timeline/schedule)
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/events$/i,                               h: listEvents },
  { m: "POST",   r: /^\/projects\/(?<projectId>[^/]+)\/events$/i,                               h: createEvent },
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/events\/(?<eventId>[^/]+)$/i,            h: getEvent },
  { m: "PATCH",  r: /^\/projects\/(?<projectId>[^/]+)\/events\/(?<eventId>[^/]+)$/i,            h: patchEvent },
  { m: "DELETE", r: /^\/projects\/(?<projectId>[^/]+)\/events\/(?<eventId>[^/]+)$/i,            h: deleteEvent },

  // Back-compat timeline shims
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/timeline$/i,                             h: getTimeline },
  { m: "POST",   r: /^\/projects\/(?<projectId>[^/]+)\/timeline$/i,                             h: addTimeline },
  { m: "PATCH",  r: /^\/projects\/(?<projectId>[^/]+)\/timeline\/(?<eventId>[^/]+)$/i,          h: patchTimeline },
  { m: "DELETE", r: /^\/projects\/(?<projectId>[^/]+)\/timeline\/(?<eventId>[^/]+)$/i,          h: deleteTimeline },

  // Quick-links & thumbnails (stored on project item)
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/quick-links$/i,                          h: async (_e, C, { projectId }) => {
    const r = await ddb.get({ TableName: PROJECTS_TABLE, Key: { projectId }, ProjectionExpression: "quickLinks" });
    return json(200, C, { projectId, quickLinks: r.Item?.quickLinks || [] });
  }},
  { m: "POST",   r: /^\/projects\/(?<projectId>[^/]+)\/quick-links$/i,                          h: async (e, C, { projectId }) => {
    const link = B(e);
    link.id = link.id || `QL-${uuidv4()}`;
    const r = await ddb.update({
      TableName: PROJECTS_TABLE,
      Key: { projectId },
      UpdateExpression: "SET #ql = list_append(if_not_exists(#ql, :empty), :l), #updatedAt = :ts",
      ExpressionAttributeNames: { "#ql": "quickLinks", "#updatedAt": "updatedAt" },
      ExpressionAttributeValues: { ":l": [link], ":empty": [], ":ts": nowISO() },
      ReturnValues: "ALL_NEW",
    });
    return json(201, C, { projectId, quickLinks: r.Attributes.quickLinks || [] });
  }},
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/thumbnails$/i,                           h: async (_e, C, { projectId }) => {
    const r = await ddb.get({ TableName: PROJECTS_TABLE, Key: { projectId }, ProjectionExpression: "thumbnails" });
    return json(200, C, { projectId, thumbnails: r.Item?.thumbnails || [] });
  }},
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
      if (match) return await h(event, CORS, match.groups || {});
    }
    return json(404, CORS, { error: "Not found", method, path });
  } catch (err) {
    console.error("projects_router_error", { method, path, err });
    const msg = err?.message || "Server error";
    // Surface conditional check failures as 409
    const status = /ConditionalCheckFailed/i.test(msg) ? 409 : 500;
    return json(status, CORS, { error: msg });
  }
}
