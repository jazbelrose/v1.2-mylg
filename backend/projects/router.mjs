// backend/projects/router.mjs
import { corsHeadersFromEvent, preflightFromEvent, json } from "/opt/nodejs/utils/cors.mjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";

/* ------------ ENV ------------ */
const REGION = process.env.AWS_REGION || "us-west-2";

// Core projects table
const PROJECTS_TABLE = process.env.PROJECTS_TABLE || "Projects";

// Project directory table (contains all projects in a single item)
const PROJECT_DIRECTORY_TABLE = process.env.PROJECT_DIRECTORY_TABLE || "ProjectDirectory";

// User profiles table (for project lookup by userId)
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || "UserProfiles";
// GSIs for project visibility and team membership
const PROJECTS_VISIBILITY_INDEX = process.env.PROJECTS_VISIBILITY_INDEX || "visibility-index";


// Tasks & Events
const TASKS_TABLE   = process.env.TASKS_TABLE   || "Tasks";
const EVENTS_TABLE  = process.env.EVENTS_TABLE  || "Events";
const EVENTS_STARTAT_INDEX = process.env.EVENTS_STARTAT_INDEX || ""; // e.g., "projectId-startAt-index"

// Budgets (same schema as v1.1)
const BUDGETS_TABLE           = process.env.BUDGETS_TABLE           || "Budgets";
const BUDGET_ID_INDEX         = process.env.BUDGET_ID_INDEX         || "budgetId-index";
const BUDGET_ITEM_ID_INDEX    = process.env.BUDGET_ITEM_ID_INDEX    || "budgetItemId-index";

// --- Galleries (v1.1 table: PK=galleryId, GSI on projectId) ---
const GALLERIES_TABLE = process.env.GALLERIES_TABLE || "Galleries";
const GALLERIES_PROJECT_INDEX = process.env.GALLERIES_PROJECT_INDEX || "projectId-index";

// Dev-only: allow scans when not filtered
const SCANS_ALLOWED = (process.env.SCANS_ALLOWED || "true").toLowerCase() === "true";

/* ------------ DDB ------------ */
const ddb = DynamoDBDocument.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});

/* ------------ utils ------------ */
const M = (e) => e?.requestContext?.http?.method?.toUpperCase?.() || e?.httpMethod?.toUpperCase?.() || "GET";
const P = (e) => (e?.rawPath || e?.path || "/");
const Q = (e) => e?.queryStringParameters || {};
const B = (e) => { try { return JSON.parse(e?.body || "{}"); } catch { return {}; } };
const nowISO = () => new Date().toISOString();
const epochNow = () => Math.floor(Date.now() / 1000);

const makeEventId = (ts = Date.now()) => `E#${String(ts).padStart(13, "0")}#${uuidv4()}`;

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

/* ============== Handlers ============== */

// Health
const health = async (_e, C) => json(200, C, { ok: true, domain: "projects" });

/* ---------- Projects CRUD ---------- */
const listProjects = async (e, C) => {
  const q = Q(e);
  const limit = Math.min(parseInt(q.limit || "50", 10), 200);
  
  const authorizer = e?.requestContext?.authorizer || {};
  const jwtClaims = authorizer?.jwt?.claims || {};
  const userId = jwtClaims['custom:userId'] || jwtClaims.sub;
  
  console.log('JWT Claims Debug:', {
    authorizerKeys: Object.keys(authorizer),
    jwtKeys: authorizer?.jwt ? Object.keys(authorizer.jwt) : null,
    claimsKeys: Object.keys(jwtClaims),
    fullClaims: jwtClaims,
    userId,
    customUserId: jwtClaims['custom:userId'],
    sub: jwtClaims.sub
  });
  
  // Check for admin role in various possible locations
  const role = jwtClaims.role || 
               jwtClaims['custom:role'] || 
               (jwtClaims['cognito:groups'] && jwtClaims['cognito:groups'].includes('admin') ? 'admin' : null) ||
               (jwtClaims.groups && jwtClaims.groups.includes('admin') ? 'admin' : null);

  console.log('Admin check:', {
    userId,
    role,
    queryUserId: q.userId,
    isAdmin: role === 'admin'
  });

  // If a userId is provided in query AND user is not admin, fetch the user's project list
  if (q.userId && role !== "admin") {
    console.log('Taking user-specific path for non-admin user');
    // ... existing code ...
    const u = await ddb.get({
      TableName: USER_PROFILES_TABLE,
      Key: { userId: q.userId },
      ProjectionExpression: "projects",
    });
    const ids = Array.isArray(u.Item?.projects) ? u.Item.projects.slice(0, limit) : [];
    if (!ids.length) {
      return json(200, C, { items: [], count: 0, scannedCount: 0, lastKey: null });
    }

    // Get all projects from ProjectDirectory table
    const directoryResult = await ddb.get({
      TableName: PROJECT_DIRECTORY_TABLE,
      Key: { directoryId: "1" },
    });

    console.log('Directory result:', {
      hasItem: !!directoryResult.Item,
      hasProjects: !!(directoryResult.Item?.projects),
      projectsCount: directoryResult.Item?.projects ? Object.keys(directoryResult.Item.projects).length : 0
    });

    if (!directoryResult.Item || !directoryResult.Item.projects) {
      console.log('No projects found in directory, falling back to Projects table scan');
      
      // Fallback to old behavior for debugging
      const scanResult = await ddb.scan({
        TableName: PROJECTS_TABLE,
        Limit: limit,
      });
      
      console.log(`Fallback scan found ${scanResult.Items?.length || 0} projects`);
      return json(200, C, {
        items: scanResult.Items || [],
        count: scanResult.Count ?? 0,
        scannedCount: scanResult.ScannedCount ?? 0,
        lastKey: null,
      });
    }

      // Filter projects to only include those the user has access to
      const projectsMap = directoryResult.Item.projects;
      const userProjects = ids
        .map(projectId => {
          const projectData = projectsMap[projectId];
          if (projectData) {
            return {
              projectId,
              ...projectData,
              // Convert thumbnail back to thumbnails for frontend compatibility
              thumbnails: projectData.thumbnail ? [projectData.thumbnail] : [],
            };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, limit);

      console.log(`Returning ${userProjects.length} projects for user ${q.userId}`);
      return json(200, C, { items: userProjects, count: userProjects.length, scannedCount: userProjects.length, lastKey: null });
  }

  // Admin users can see all projects
  if (role === "admin") {
    console.log('Taking admin path - should return all projects');
    // ... existing code ...
    try {
      // Get all projects from the ProjectDirectory table
      const directoryResult = await ddb.get({
        TableName: PROJECT_DIRECTORY_TABLE,
        Key: { directoryId: "1" },
      });

      console.log('Admin directory result:', {
        hasItem: !!directoryResult.Item,
        hasProjects: !!(directoryResult.Item?.projects),
        projectsCount: directoryResult.Item?.projects ? Object.keys(directoryResult.Item.projects).length : 0
      });

      if (!directoryResult.Item || !directoryResult.Item.projects) {
        console.log('No projects found in directory for admin, falling back to Projects table scan');
        
        // Fallback to old behavior for debugging
        const scanResult = await ddb.scan({
          TableName: PROJECTS_TABLE,
          Limit: limit,
        });
        
        console.log(`Admin fallback scan found ${scanResult.Items?.length || 0} projects`);
        return json(200, C, {
          items: scanResult.Items || [],
          count: scanResult.Count ?? 0,
          scannedCount: scanResult.ScannedCount ?? 0,
          lastKey: null,
        });
      }

      // Extract projects from the directory
      const projectsMap = directoryResult.Item.projects;
      const allProjects = Object.entries(projectsMap).map(([projectId, projectData]) => ({
        projectId,
        ...projectData,
      }));

      // Apply pagination
      const startIndex = q.lastKey ? parseInt(q.lastKey) : 0;
      const endIndex = startIndex + limit;
      const paginatedProjects = allProjects.slice(startIndex, endIndex);

      // Convert projects to expected format (add any missing fields from original Projects table if needed)
      const items = paginatedProjects.map(project => ({
        ...project,
        // Ensure projectId is included (it should be from the map key)
        projectId: project.projectId,
        // Convert thumbnail back to thumbnails for frontend compatibility
        thumbnails: project.thumbnail ? [project.thumbnail] : [],
      }));

      console.log(`Admin returning ${items.length} projects out of ${allProjects.length} total`);
      return json(200, C, {
        items,
        count: items.length,
        scannedCount: allProjects.length, // Total count for scannedCount
        lastKey: endIndex < allProjects.length ? endIndex.toString() : null,
      });
    } catch (error) {
      console.error('Admin directory query error:', error);
      // Return empty result on error
      return json(200, C, {
        items: [],
        count: 0,
        scannedCount: 0,
        lastKey: null,
        warning: 'Directory query temporarily unavailable'
      });
    }
  }
  
  // Non-admin users see only their assigned projects
  if (!userId) return json(400, C, { error: "Missing userId" });
  
  console.log('Taking fallback non-admin path');
  // Fetch user's project IDs from their profile
  const u = await ddb.get({
    TableName: USER_PROFILES_TABLE,
    Key: { userId },
    ProjectionExpression: "projects",
  });
  const projectIds = Array.isArray(u.Item?.projects) ? u.Item.projects.slice(0, limit) : [];
  
  if (!projectIds.length) {
    return json(200, C, { items: [], count: 0, scannedCount: 0, lastKey: null });
  }
  
  // Get all projects from ProjectDirectory table
  const directoryResult = await ddb.get({
    TableName: PROJECT_DIRECTORY_TABLE,
    Key: { directoryId: "1" },
  });

    if (!directoryResult.Item || !directoryResult.Item.projects) {
      console.log('No projects found in directory for user, falling back to Projects table');
      
      // Fallback to old behavior for debugging
      const r = await ddb.batchGet({
        RequestItems: {
          [PROJECTS_TABLE]: { 
            Keys: ids.map((projectId) => ({ projectId })) 
          },
        },
      });
      
      console.log(`Fallback found ${r.Responses?.[PROJECTS_TABLE]?.length || 0} projects for user`);
      return json(200, C, { items: r.Responses?.[PROJECTS_TABLE] || [], count: (r.Responses?.[PROJECTS_TABLE] || []).length, scannedCount: (r.Responses?.[PROJECTS_TABLE] || []).length, lastKey: null });
    }  // Filter projects to only include those the user has access to
  const projectsMap = directoryResult.Item.projects;
  const userProjects = projectIds
    .map(projectId => {
      const projectData = projectsMap[projectId];
      if (projectData) {
        return {
          projectId,
          ...projectData,
          // Convert thumbnail back to thumbnails for frontend compatibility
          thumbnails: projectData.thumbnail ? [projectData.thumbnail] : [],
        };
      }
      return null;
    })
    .filter(Boolean);

  return json(200, C, { 
    items: userProjects, 
    count: userProjects.length, 
    scannedCount: userProjects.length, 
    lastKey: null 
  });
};

const createProject = async (e, C) => {
  const body = B(e);
  const projectId = body.projectId || `P-${uuidv4()}`;
  const ts = nowISO();

  const team = body.team || [];
  const teamUserIds = body.teamUserIds || team.map((m) => m.userId).filter(Boolean);
  const item = {
    projectId,
    title: body.title || "",
    status: body.status || "new",
    team,
    teamUserIds,
    visibility: body.visibility || "admin",
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
  if (!r.Item) return json(200, C, null);
  
  // Explicitly unmarshall to ensure plain JSON format
  const unmarshalledItem = unmarshall(r.Item);
  return json(200, C, unmarshalledItem);
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

/* ---------- Team (array on project) ---------- */
const getTeam = async (_e, C, { projectId }) => {
  const r = await ddb.get({
    TableName: PROJECTS_TABLE,
    Key: { projectId },
    ProjectionExpression: "projectId, team, teamUserIds",
  });
  return json(200, C, {
    projectId,
    team: r.Item?.team || [],
    teamUserIds: r.Item?.teamUserIds || [],
  });
};

const addTeam = async (e, C, { projectId }) => {
  const b = B(e);
  const members = Array.isArray(b) ? b : [b];
  const current = await ddb.get({
    TableName: PROJECTS_TABLE,
    Key: { projectId },
    ProjectionExpression: "team, teamUserIds",
  });
  const currTeam = current.Item?.team || [];
  const currIds = current.Item?.teamUserIds || [];
  const newTeam = currTeam.concat(members);
  const newIds = Array.from(new Set(currIds.concat(members.map((m) => m.userId).filter(Boolean))));
  const r = await ddb.update({
    TableName: PROJECTS_TABLE,
    Key: { projectId },
    UpdateExpression: "SET #team = :team, #teamUserIds = :ids, #updatedAt = :ts",
    ExpressionAttributeNames: {
      "#team": "team",
      "#teamUserIds": "teamUserIds",
      "#updatedAt": "updatedAt",
    },
    ExpressionAttributeValues: {
      ":team": newTeam,
      ":ids": newIds,
      ":ts": nowISO(),
    },
    ReturnValues: "ALL_NEW",
  });
  return json(201, C, {
    projectId,
    team: r.Attributes.team || [],
    teamUserIds: r.Attributes.teamUserIds || [],
  });
};

const removeTeam = async (_e, C, { projectId, userId }) => {
  const r = await ddb.get({
    TableName: PROJECTS_TABLE,
    Key: { projectId },
    ProjectionExpression: "team, teamUserIds",
  });
  const team = (r.Item?.team || []).filter((m) => m?.userId !== userId);
  const teamUserIds = (r.Item?.teamUserIds || []).filter((id) => id !== userId);
  await ddb.update({
    TableName: PROJECTS_TABLE,
    Key: { projectId },
    UpdateExpression: "SET #team = :team, #teamUserIds = :ids, #updatedAt = :ts",
    ExpressionAttributeNames: {
      "#team": "team",
      "#teamUserIds": "teamUserIds",
      "#updatedAt": "updatedAt",
    },
    ExpressionAttributeValues: { ":team": team, ":ids": teamUserIds, ":ts": nowISO() },
  });
  return json(200, C, { projectId, removedUserId: userId, team, teamUserIds });
};

/* ---------- Tasks (PK=projectId, SK=taskId) ---------- */
const listTasks = async (_e, C, { projectId }) => {
  const r = await ddb.query({
    TableName: TASKS_TABLE,
    KeyConditionExpression: "projectId = :p",
    ExpressionAttributeValues: { ":p": projectId },
  });
  return json(200, C, { projectId, tasks: r.Items || [] });
};

const createTask = async (e, C, { projectId }) => {
  const b = B(e);
  const taskId = b.taskId || `T-${uuidv4()}`;
  const ts = nowISO();
  const item = {
    projectId,
    taskId,
    title: b.title || "",
    status: b.status || "todo",
    assigneeId: b.assigneeId,
    dueAt: b.dueAt,
    createdAt: ts,
    updatedAt: ts,
    ...b,
  };
  const dueDate = item.dueAt ? String(item.dueAt).slice(0, 10) : "";
  item.statusDueDateTaskId = `${item.status}#${dueDate}#${taskId}`;
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
  const b = B(e);
  if (b.status !== undefined || b.dueAt !== undefined) {
    const curr = await ddb.get({
      TableName: TASKS_TABLE,
      Key: { projectId, taskId },
      ProjectionExpression: "status, dueAt",
    });
    const newStatus = b.status ?? curr.Item?.status ?? "todo";
    const newDueAt = b.dueAt ?? curr.Item?.dueAt;
    const dueDate = newDueAt ? String(newDueAt).slice(0, 10) : "";
    b.statusDueDateTaskId = `${newStatus}#${dueDate}#${taskId}`;
  }
  const upd = buildUpdate({ ...b, updatedAt: nowISO() });
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

/* ---------- Events (unified timeline/schedule) ---------- */
const listEvents = async (e, C, { projectId }) => {
  const q = Q(e);
  const view = (q.view || "timeline").toLowerCase();
  const fromISO = q.from || null;
  const toISO   = q.to || null;
  const kinds = (q.kind || "").split(",").map((s) => s.trim()).filter(Boolean);

  let items = [];
  if (view === "schedule" && EVENTS_STARTAT_INDEX) {
    const values = { ":p": projectId };
    let cond = "projectId = :p";
    if (fromISO && toISO) {
      cond += " AND #startAt BETWEEN :from AND :to";
      values[":from"] = fromISO; values[":to"] = toISO;
    } else if (fromISO) {
      cond += " AND #startAt >= :from";
      values[":from"] = fromISO;
    } else if (toISO) {
      cond += " AND #startAt <= :to";
      values[":to"] = toISO;
    }
    const r = await ddb.query({
      TableName: EVENTS_TABLE,
      IndexName: EVENTS_STARTAT_INDEX,
      KeyConditionExpression: cond,
      ExpressionAttributeNames: { "#startAt": "startAt" },
      ExpressionAttributeValues: values,
      ScanIndexForward: true,
    });
    items = r.Items || [];
  } else {
    const r = await ddb.query({
      TableName: EVENTS_TABLE,
      KeyConditionExpression: "projectId = :p",
      ExpressionAttributeValues: { ":p": projectId },
      ScanIndexForward: false, // eventId encoded with millis for DESC
    });
    items = r.Items || [];
  }

  if (kinds.length) items = items.filter((ev) => ev?.kind && kinds.includes(ev.kind));
  return json(200, C, { projectId, view, events: items });
};

const createEvent = async (e, C, { projectId }) => {
  const b = B(e);
  const tsMillis = Date.now();
  const eventId = b.eventId || makeEventId(tsMillis);
  const ts = b.ts || new Date(tsMillis).toISOString();

  const item = {
    projectId,
    eventId,
    ts,
    kind: b.kind || "note",
    title: b.title || "",
    description: b.description,
    startAt: b.startAt,
    endAt: b.endAt,
    actorId: b.actorId,
    tags: b.tags || [],
    meta: b.meta || {},
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
  const b = B(e);
  const upd = buildUpdate({ ...b, updatedAt: nowISO() });
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

// Back-compat timeline shims
const getTimeline = (e, C, g) => {
  const e2 = { ...e, queryStringParameters: { ...(Q(e) || {}), view: "timeline" } };
  return listEvents(e2, C, g);
};
const addTimeline = createEvent;
const patchTimeline = patchEvent;
const deleteTimeline = deleteEvent;

/* ---------- Quick Links & Thumbnails on Project ---------- */
const getQuickLinks = async (_e, C, { projectId }) => {
  const r = await ddb.get({ TableName: PROJECTS_TABLE, Key: { projectId }, ProjectionExpression: "quickLinks" });
  return json(200, C, { projectId, quickLinks: r.Item?.quickLinks || [] });
};

const addQuickLink = async (e, C, { projectId }) => {
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
};

const getThumbnails = async (_e, C, { projectId }) => {
  const r = await ddb.get({ TableName: PROJECTS_TABLE, Key: { projectId }, ProjectionExpression: "thumbnails" });
  return json(200, C, { projectId, thumbnails: r.Item?.thumbnails || [] });
};

/* ---------- Galleries ---------- */
// GET /projects/{projectId}/galleries
const listProjectGalleries = async (_e, C, { projectId }) => {
  const r = await ddb.query({
    TableName: GALLERIES_TABLE,
    IndexName: GALLERIES_PROJECT_INDEX,
    KeyConditionExpression: "projectId = :pid",
    ExpressionAttributeValues: { ":pid": projectId },
  });
  return json(200, C, r.Items || []);
};

// POST /projects/{projectId}/galleries
// body: { name, ...customFields }
const createGallery = async (e, C, { projectId }) => {
  const b = B(e);
  if (!b.name) return json(400, C, "name is required");
  const galleryId = b.galleryId || uuidv4();
  const now = epochNow();

  const item = {
    ...b,
    projectId,
    galleryId,           // PK
    createdAt: now,
    updatedAt: now,
  };

  await ddb.put({
    TableName: GALLERIES_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(galleryId)",
  });

  return json(201, C, item);
};

// GET /projects/{projectId}/galleries/{galleryId}
const getGallery = async (_e, C, { projectId, galleryId }) => {
  const r = await ddb.get({ TableName: GALLERIES_TABLE, Key: { galleryId } });
  const item = r.Item || null;
  // optional guard: ensure the item belongs to this project
  if (item && item.projectId && item.projectId !== projectId) {
    return json(404, C, null);
  }
  return json(200, C, item);
};

// PUT /projects/{projectId}/galleries/{galleryId}  (merge/upsert)
const putGallery = async (e, C, { projectId, galleryId }) => {
  const b = B(e);
  // fetch so we merge (v1.1 behavior)
  const ex = await ddb.get({ TableName: GALLERIES_TABLE, Key: { galleryId } });
  const merged = {
    ...(ex.Item || {}),
    ...b,
    projectId,
    galleryId,
    updatedAt: epochNow(),
    createdAt: ex.Item?.createdAt || epochNow(),
  };
  await ddb.put({ TableName: GALLERIES_TABLE, Item: merged });
  return json(200, C, merged);
};

// PATCH /projects/{projectId}/galleries/{galleryId}
const patchGallery = async (e, C, { projectId, galleryId }) => {
  const b = B(e);
  const upd = buildUpdate({ ...b, updatedAt: epochNow(), projectId }); // keep projectId aligned
  if (!upd) return json(400, C, "No fields to update");
  const r = await ddb.update({
    TableName: GALLERIES_TABLE,
    Key: { galleryId },
    ...upd,
    ReturnValues: "ALL_NEW",
  });
  // optional project guard
  if (r.Attributes?.projectId && r.Attributes.projectId !== projectId) {
    return json(404, C, null);
  }
  return json(200, C, r.Attributes);
};

// DELETE /projects/{projectId}/galleries/{galleryId}
const deleteGallery = async (_e, C, { projectId, galleryId }) => {
  // (optional) read first to validate projectId
  const r0 = await ddb.get({ TableName: GALLERIES_TABLE, Key: { galleryId } });
  if (!r0.Item || (r0.Item.projectId && r0.Item.projectId !== projectId)) {
    return json(404, C, null);
  }
  await ddb.delete({ TableName: GALLERIES_TABLE, Key: { galleryId } });
  return json(204, C, "");
};

/* ---------- Budgets (headers & line items) ---------- */
// Helpers
function enforcePrefix(id) {
  if (!id.startsWith("HEADER-") && !id.startsWith("LINE-")) {
    throw new Error("budgetItemId must start with HEADER- or LINE-");
  }
}

// POST /projects/{projectId}/budget  (create header OR line item)
// Body: { isHeader?: boolean, budgetId?, budgetItemId?, ... }
const createBudgetItem = async (e, C, { projectId }) => {
  const data = B(e);
  if (!projectId) return json(400, C, "projectId required");

  const isHeader = data.isHeader === true || !data.budgetId;

  // budgetId
  if (isHeader && !data.budgetId) {
    data.budgetId = uuidv4();
  } else if (!isHeader && !data.budgetId) {
    return json(400, C, "budgetId required for line item creation");
  }

  // budgetItemId
  let budgetItemId = data.budgetItemId;
  if (!budgetItemId) {
    budgetItemId = (isHeader ? "HEADER-" : "LINE-") + uuidv4();
  }
  enforcePrefix(budgetItemId);

  const ts = nowISO();
  const item = {
    projectId,
    budgetId: data.budgetId,
    budgetItemId,
    createdAt: ts,
    updatedAt: ts,
    revision: data.revision ?? 1,
    ...data,
  };
  delete item.isHeader;

  await ddb.put({
    TableName: BUDGETS_TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(projectId) AND attribute_not_exists(budgetItemId)",
  });

  return json(201, C, item);
};

// PUT /projects/{projectId}/budget/items/{budgetItemId}  (full upsert; requires budgetId)
const putBudgetItem = async (e, C, { projectId, budgetItemId }) => {
  const data = B(e);
  if (!projectId || !budgetItemId) return json(400, C, "projectId and budgetItemId required");
  if (!data.budgetId) return json(400, C, "budgetId required");
  enforcePrefix(budgetItemId);

  const ts = nowISO();
  const item = {
    ...data,
    projectId,
    budgetItemId,
    updatedAt: ts,
    createdAt: data.createdAt || ts,
    revision: data.revision ?? 1,
  };
  await ddb.put({ TableName: BUDGETS_TABLE, Item: item });
  return json(200, C, item);
};

// PATCH /projects/{projectId}/budget/items/{budgetItemId}
const patchBudgetItem = async (e, C, { projectId, budgetItemId }) => {
  const data = B(e);
  if (!projectId || !budgetItemId) return json(400, C, "projectId and budgetItemId required");
  enforcePrefix(budgetItemId);
  if (Object.keys(data).length === 0) return json(400, C, "No fields to update");

  const expr = buildUpdate({ ...data, updatedAt: nowISO() });
  const r = await ddb.update({
    TableName: BUDGETS_TABLE,
    Key: { projectId, budgetItemId },
    ...expr,
    ReturnValues: "ALL_NEW",
  });
  return json(200, C, r.Attributes);
};

// GET /projects/{projectId}/budget  (?headers=true supported)
const listBudgetForProject = async (e, C, { projectId }) => {
  const headersOnly = (Q(e).headers || "").toLowerCase() === "true";
  if (headersOnly) {
    const r = await ddb.query({
      TableName: BUDGETS_TABLE,
      KeyConditionExpression: "projectId = :p AND begins_with(budgetItemId, :h)",
      ExpressionAttributeValues: { ":p": projectId, ":h": "HEADER-" },
    });
    return json(200, C, r.Items || []);
  }
  const r = await ddb.query({
    TableName: BUDGETS_TABLE,
    KeyConditionExpression: "projectId = :p",
    ExpressionAttributeValues: { ":p": projectId },
  });
  return json(200, C, r.Items || []);
};

// GET /projects/{projectId}/budget/items/{budgetItemId}
const getBudgetItem = async (_e, C, { projectId, budgetItemId }) => {
  enforcePrefix(budgetItemId);
  const r = await ddb.get({
    TableName: BUDGETS_TABLE,
    Key: { projectId, budgetItemId },
  });
  return json(200, C, r.Item || null);
};

// DELETE /projects/{projectId}/budget/items/{budgetItemId}
const deleteBudgetItem = async (_e, C, { projectId, budgetItemId }) => {
  enforcePrefix(budgetItemId);
  await ddb.delete({
    TableName: BUDGETS_TABLE,
    Key: { projectId, budgetItemId },
  });
  return json(204, C, "");
};

// Extra convenience lookups (optional):
// GET /budgets/byBudgetId/{budgetId}
const listByBudgetId = async (_e, C, { budgetId }) => {
  const r = await ddb.query({
    TableName: BUDGETS_TABLE,
    IndexName: BUDGET_ID_INDEX,
    KeyConditionExpression: "budgetId = :b",
    ExpressionAttributeValues: { ":b": budgetId },
  });
  return json(200, C, r.Items || []);
};

// GET /budgets/byItemId/{budgetItemId}
const getByBudgetItemId = async (_e, C, { budgetItemId }) => {
  enforcePrefix(budgetItemId);
  const r = await ddb.query({
    TableName: BUDGETS_TABLE,
    IndexName: BUDGET_ITEM_ID_INDEX,
    KeyConditionExpression: "budgetItemId = :bi",
    ExpressionAttributeValues: { ":bi": budgetItemId },
    Limit: 1,
  });
  return json(200, C, (r.Items && r.Items[0]) || null);
};

/* ============== Routes ============== */
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

  // Tasks
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/tasks$/i,                                h: listTasks },
  { m: "POST",   r: /^\/projects\/(?<projectId>[^/]+)\/tasks$/i,                                h: createTask },
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/tasks\/(?<taskId>[^/]+)$/i,              h: getTask },
  { m: "PATCH",  r: /^\/projects\/(?<projectId>[^/]+)\/tasks\/(?<taskId>[^/]+)$/i,              h: patchTask },
  { m: "DELETE", r: /^\/projects\/(?<projectId>[^/]+)\/tasks\/(?<taskId>[^/]+)$/i,              h: deleteTask },

  // Events (unified)
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

  // Quick-links & thumbnails
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/quick-links$/i,                          h: getQuickLinks },
  { m: "POST",   r: /^\/projects\/(?<projectId>[^/]+)\/quick-links$/i,                          h: addQuickLink },
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/thumbnails$/i,                           h: getThumbnails },

  // Galleries
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/galleries$/i,                          h: listProjectGalleries },
  { m: "POST",   r: /^\/projects\/(?<projectId>[^/]+)\/galleries$/i,                          h: createGallery },
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/galleries\/(?<galleryId>[^/]+)$/i,     h: getGallery },
  { m: "PUT",    r: /^\/projects\/(?<projectId>[^/]+)\/galleries\/(?<galleryId>[^/]+)$/i,     h: putGallery },
  { m: "PATCH",  r: /^\/projects\/(?<projectId>[^/]+)\/galleries\/(?<galleryId>[^/]+)$/i,     h: patchGallery },
  { m: "DELETE", r: /^\/projects\/(?<projectId>[^/]+)\/galleries\/(?<galleryId>[^/]+)$/i,     h: deleteGallery },

  // Budgets under project
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/budget$/i,                               h: listBudgetForProject },
  { m: "POST",   r: /^\/projects\/(?<projectId>[^/]+)\/budget$/i,                               h: createBudgetItem },
  { m: "GET",    r: /^\/projects\/(?<projectId>[^/]+)\/budget\/items\/(?<budgetItemId>[^/]+)$/i, h: getBudgetItem },
  { m: "PUT",    r: /^\/projects\/(?<projectId>[^/]+)\/budget\/items\/(?<budgetItemId>[^/]+)$/i, h: putBudgetItem },
  { m: "PATCH",  r: /^\/projects\/(?<projectId>[^/]+)\/budget\/items\/(?<budgetItemId>[^/]+)$/i, h: patchBudgetItem },
  { m: "DELETE", r: /^\/projects\/(?<projectId>[^/]+)\/budget\/items\/(?<budgetItemId>[^/]+)$/i, h: deleteBudgetItem },

  // Optional convenience lookups (not under /projects)
  { m: "GET",    r: /^\/budgets\/byBudgetId\/(?<budgetId>[^/]+)$/i,                             h: listByBudgetId },
  { m: "GET",    r: /^\/budgets\/byItemId\/(?<budgetItemId>[^/]+)$/i,                           h: getByBudgetItemId },
];

/* ============== Entrypoint ============== */
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
    const status = /ConditionalCheckFailed/i.test(msg) ? 409 : 500;
    return json(status, CORS, { error: msg });
  }
}
