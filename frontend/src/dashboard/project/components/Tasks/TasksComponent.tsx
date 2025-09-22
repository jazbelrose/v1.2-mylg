import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Project } from "@/app/contexts/DataProvider";
import LocationComponent from "@/dashboard/project/components/Shared/LocationComponent";
import {
  createTask,
  fetchTasks,
  fetchUserProfilesBatch,
} from "@/shared/utils/api";

// Types
type Priority = "Low" | "Medium" | "High";
type Status = "To Do" | "In Progress" | "Done";
type ApiStatus = "todo" | "in_progress" | "done";
type ApiPriority = "low" | "medium" | "high";

interface TeamMember {
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  email?: string;
}

interface ApiTask {
  taskId?: string;
  id?: string;
  projectId: string;
  title?: string;
  name?: string;
  assigneeId?: string;
  assignedTo?: string;
  priority?: string | null;
  status?: string | null;
  dueDate?: string | null;
}

interface TasksComponentProps {
  projectId?: string;
  userId?: string;
  team?: TeamMember[];
  activeProject?: Project;
  onActiveProjectChange?: (project: Project) => void;
}

type Task = {
  id: string;
  title: string;
  assignee: string;
  assigneeId?: string;
  priority: Priority;
  status: Status;
  due?: string;
};

// Demo data
 const seed: Task[] = [
  { id: "1", title: "Confirm venue walkthrough", assignee: "Jaz",    priority: "High",   status: "In Progress", due: "2025-09-23" },
  { id: "2", title: "Order vinyl print",          assignee: "Art Pa", priority: "Medium", status: "To Do",       due: "2025-09-24" },
  { id: "3", title: "Ship lighting kit",          assignee: "Taylor", priority: "Low",    status: "To Do",       due: "2025-09-26" },
  { id: "4", title: "Approve signage layout",     assignee: "Jaz",    priority: "Medium", status: "To Do",       due: "2025-09-25" },
  { id: "5", title: "Prep paint station",         assignee: "Yovany", priority: "Low",    status: "To Do",       due: "2025-09-27" },
 ];

 const statusDisplayMap: Record<string, Status> = {
   todo: "To Do",
   "to do": "To Do",
   in_progress: "In Progress",
   "in progress": "In Progress",
   done: "Done",
 };

 const priorityDisplayMap: Record<string, Priority> = {
   low: "Low",
   medium: "Medium",
   high: "High",
 };

 const createId = () => {
   if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
     return crypto.randomUUID();
   }
   return Math.random().toString(36).slice(2);
 };

 const formatTeamMember = (member?: TeamMember | null) => {
   if (!member) return "";
   if (member.displayName) return member.displayName;
   const fullName = [member.firstName, member.lastName]
     .filter(Boolean)
     .join(" ")
     .trim();
   if (fullName) return fullName;
   if (member.username) return member.username;
   if (member.email) return member.email;
   return "";
 };

 const mapStatusToDisplay = (status?: string | null): Status => {
   if (!status) return "To Do";
   const normalized = status.toLowerCase();
   return statusDisplayMap[normalized] || "To Do";
 };

 const mapPriorityToDisplay = (priority?: string | null): Priority => {
   if (!priority) return "Medium";
   const normalized = priority.toLowerCase();
   return priorityDisplayMap[normalized] || "Medium";
 };

 const mapStatusToApi = (status: Status): ApiStatus => {
   switch (status) {
     case "In Progress":
       return "in_progress";
     case "Done":
       return "done";
     default:
       return "todo";
   }
 };

 const mapPriorityToApi = (priority: Priority): ApiPriority => {
   switch (priority) {
     case "High":
       return "high";
     case "Low":
       return "low";
     default:
       return "medium";
   }
 };

// Avatar and small chips
 const Avatar = ({ name }: { name: string }) => {
   const initials = name
     .split(" ")
     .map((s) => s[0])
     .filter(Boolean)
     .join("")
     .slice(0, 2)
     .toUpperCase();
   return (
     <div className="ov-avatar" title={name} aria-label={`Assignee ${name}`}>
       {initials || "?"}
     </div>
   );
 };
 const Chip = ({
   children,
   tone = "neutral",
 }: {
   children: React.ReactNode;
   tone?: "neutral" | "success" | "warn" | "danger";
 }) => <span className={`ov-chip ov-chip--${tone}`}>{children}</span>;
 const priorityTone = (p: Priority) =>
   p === "High" ? "danger" : p === "Medium" ? "warn" : "neutral";

// Bottom-sheet / Drawer controller
function useResponsivePanel() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsMobile(false);
      return;
    }
    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 820px)")
        : null;
    if (!mediaQuery) {
      setIsMobile(false);
      return;
    }
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }
    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(update);
      return () => mediaQuery.removeListener(update);
    }
    return undefined;
  }, []);
  return { open, setOpen, isMobile };
}

// Quick add form (inline)
 const QuickAdd: React.FC<{
   onAdd: (t: Task) => Promise<void> | void;
   defaultAssignee: string;
 }> = ({ onAdd, defaultAssignee }) => {
   const [title, setTitle] = useState("");
   const [priority, setPriority] = useState<Priority>("Medium");
   const save = async () => {
     if (!title.trim()) return;
     const payload: Task = {
       id: createId(),
       title: title.trim(),
       assignee: defaultAssignee,
       priority,
       status: "To Do",
     };
     await onAdd(payload);
     setTitle("");
   };
   return (
     <div className="ov-quickAdd" role="form" aria-label="Quick add task">
       <input
         aria-label="Task title"
         value={title}
         onChange={(e) => setTitle(e.target.value)}
         placeholder="Quick add a task…"
       />
       <select
         aria-label="Priority"
         value={priority}
         onChange={(e) => setPriority(e.target.value as Priority)}
       >
         <option>Low</option>
         <option>Medium</option>
         <option>High</option>
       </select>
       <button className="ov-btn ov-btn--primary" onClick={save} type="button">
         Add
       </button>
     </div>
   );
 };

// Small task row (for lists)
 const Row: React.FC<{ t: Task }> = ({ t }) => (
   <div className="ov-row" title={t.title}>
     <div className="ov-row__left">
       <Chip tone={priorityTone(t.priority)}>{t.priority}</Chip>
       <span className="ov-row__title">{t.title}</span>
     </div>
     <div className="ov-row__right">
       <span className="ov-row__due">
         {t.due ? new Date(`${t.due}T00:00:00`).toLocaleDateString() : "—"}
       </span>
       <Avatar name={t.assignee} />
     </div>
   </div>
 );

// The responsive panel component
 const TaskPanel: React.FC<{
   open: boolean;
   onClose: () => void;
   children: React.ReactNode;
   mode?: "sheet" | "drawer";
 }> = ({ open, onClose, children, mode = "drawer" }) => {
   return (
     <div
       className={`ov-panel ${open ? "is-open" : ""} ${
         mode === "sheet" ? "is-sheet" : "is-drawer"
       }`}
       aria-hidden={!open}
     >
       <div className="ov-panel__scrim" onClick={onClose} />
       <div
         className="ov-panel__body"
         role="dialog"
         aria-modal="true"
         aria-label="Tasks"
       >
         <div className="ov-panel__grab" aria-hidden="true"></div>
         <header className="ov-panel__head">
           <h3>Tasks</h3>
           <button className="ov-btn" onClick={onClose} aria-label="Close" type="button">
             ✕
           </button>
         </header>
         <div className="ov-panel__content">{children}</div>
       </div>
     </div>
   );
 };

// Main widget to embed on the Project Overview
export default function ProjectOverviewTasks({
  projectId = "",
  userId,
  team = [],
  activeProject,
  onActiveProjectChange,
}: TasksComponentProps) {
  const [teamProfiles, setTeamProfiles] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>(() => (projectId ? [] : seed));

  const lookupMember = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      return (
         teamProfiles.find((member) => member.userId === id) ||
         team.find((member) => member.userId === id)
       );
     },
     [team, teamProfiles]
   );

   const resolveAssigneeName = useCallback(
     (assigneeId?: string, fallback?: string) => {
       const member = lookupMember(assigneeId);
       const name = formatTeamMember(member);
       if (name) return name;
       if (fallback && fallback.trim()) return fallback;
       return "Unassigned";
     },
     [lookupMember]
   );

   const mapApiTask = useCallback(
     (task: ApiTask): Task => {
       const id = task.taskId || task.id || createId();
       const assigneeId = task.assigneeId;
       const fallbackAssignee =
         typeof task.assignedTo === "string" ? task.assignedTo : undefined;
       return {
         id,
         title: task.title || task.name || "",
         assigneeId,
         assignee: resolveAssigneeName(assigneeId, fallbackAssignee),
         priority: mapPriorityToDisplay(task.priority),
         status: mapStatusToDisplay(task.status),
         due: task.dueDate || undefined,
       };
     },
     [resolveAssigneeName]
   );

  const refreshTasks = useCallback(async () => {
    if (!projectId) {
      setTasks(seed);
      return;
    }
     try {
       const data = await fetchTasks(projectId);
       const normalized = (data || []).map((task: ApiTask) => mapApiTask(task));
       setTasks(normalized);
     } catch (err) {
       console.error("Failed to load tasks", err);
     }
   }, [mapApiTask, projectId]);

  const { open, setOpen } = useResponsivePanel();

   useEffect(() => {
     let active = true;
     const loadProfiles = async () => {
       if (!team.length) {
         if (active) setTeamProfiles([]);
         return;
       }
       const userIds = team.map((member) => member.userId).filter(Boolean);
       if (!userIds.length) {
         if (active) setTeamProfiles(team);
         return;
       }
       try {
         const profiles = await fetchUserProfilesBatch(userIds);
         if (active) {
           setTeamProfiles((profiles && profiles.length ? profiles : team) || []);
         }
       } catch (err) {
         console.error("Failed to fetch team profiles", err);
         if (active) setTeamProfiles(team);
       }
     };
     loadProfiles();
     return () => {
       active = false;
     };
   }, [team]);

   useEffect(() => {
     refreshTasks();
   }, [refreshTasks]);

   const currentUserName = useMemo(() => {
     const member = lookupMember(userId);
     const name = formatTeamMember(member);
     if (name) return name;
     const fallback = teamProfiles[0] || team[0];
     return formatTeamMember(fallback) || "Me";
   }, [lookupMember, teamProfiles, team, userId]);

  const { myTasks, teamTasks } = useMemo(() => {
    const mine: Task[] = [];
    const others: Task[] = [];
    const hasUserId = Boolean(userId);
    tasks.forEach((task) => {
      const isMine = hasUserId
        ? task.assigneeId === userId || task.assignee === currentUserName
        : task.assignee === currentUserName;
      if (isMine) {
        mine.push(task);
      } else {
        others.push(task);
      }
    });
    return { myTasks: mine, teamTasks: others };
  }, [currentUserName, tasks, userId]);

   const addTask = useCallback(
     async (task: Task) => {
       const generatedId = task.id || createId();
       const enriched: Task = {
         ...task,
         id: generatedId,
         assigneeId: userId,
         assignee: currentUserName,
       };
       setTasks((prev) => [enriched, ...prev]);
       if (!projectId) return;
       try {
         await createTask({
           projectId,
           taskId: generatedId,
           title: enriched.title,
           assigneeId: userId || "",
           status: mapStatusToApi(enriched.status),
           priority: mapPriorityToApi(enriched.priority),
           dueDate: enriched.due || "",
         });
         await refreshTasks();
       } catch (err) {
         console.error("Failed to create task", err);
         await refreshTasks();
       }
     },
     [currentUserName, projectId, refreshTasks, userId]
   );

   const overdueCount = useMemo(
     () =>
       tasks.filter((t) => {
         if (!t.due || t.status === "Done") return false;
         const dueDate = new Date(`${t.due}T00:00:00`);
         const now = new Date();
         dueDate.setHours(0, 0, 0, 0);
         now.setHours(0, 0, 0, 0);
         return dueDate < now;
       }).length,
     [tasks]
   );
   const completed = useMemo(
     () => tasks.filter((t) => t.status === "Done").length,
     [tasks]
   );

   return (
    <div className="ov ov-shell">
       <div className="ov-head">
         <h3>Tasks</h3>
         <div className="ov-head__stats">
           <span className="ov-stat"><strong>{completed}</strong><span> Completed</span></span>
           <span className={`ov-stat ${overdueCount>0 ? 'is-warn' : ''}`}><strong>{overdueCount}</strong><span> Overdue</span></span>
           <span className="ov-stat"><strong>{tasks.length}</strong><span> Total</span></span>
         </div>
         <div className="ov-head__actions">
           <button className="ov-btn" onClick={() => setOpen(true)} type="button">Open</button>
           <button className="ov-btn ov-btn--primary" onClick={() => setOpen(true)} type="button">New Task</button>
         </div>
       </div>

       <div className="ov-quickWrap"><span className="ov-quickLabel">Quick Task</span><QuickAdd onAdd={addTask} defaultAssignee={currentUserName} /></div>

       <div className="ov-grid">
         <section className="ov-card ov-map">
           {activeProject && onActiveProjectChange ? (
             <LocationComponent
               activeProject={activeProject}
               onActiveProjectChange={onActiveProjectChange}
             />
           ) : (
             <div className="ov-map__empty">Location unavailable</div>
           )}
         </section>
         <section className="ov-card">
           <header><h4>My Tasks</h4><span className="ov-pill">{myTasks.length}</span></header>
           {myTasks.length===0 ? <div className="ov-empty">Nothing yet—create your first task.</div> : myTasks.slice(0,4).map((t) => <Row key={t.id} t={t} />) }
         </section>
         <section className="ov-card">
           <header><h4>Team Tasks</h4><span className="ov-pill">{teamTasks.length}</span></header>
           {teamTasks.length===0 ? <div className="ov-empty">No team tasks.</div> : teamTasks.slice(0,4).map((t) => <Row key={t.id} t={t} />) }
         </section>
       </div>

       {/* Panel content mirrors the task page but stays lightweight */}
       <TaskPanel open={open} onClose={() => setOpen(false)} mode="sheet">
         <div className="ov-panel__mapWide" />
         <QuickAdd onAdd={addTask} defaultAssignee={currentUserName} />
         <div className="ov-panel__lists">
           <h4>My Tasks</h4>
           {myTasks.map((t) => <Row key={t.id} t={t} />) }
           <h4 style={{marginTop:16}}>Team Tasks</h4>
           {teamTasks.map((t) => <Row key={t.id} t={t} />) }
           <div className="ov-panel__cta">
             <button className="ov-btn ov-btn--primary" type="button">Go to full Task page →</button>
           </div>
         </div>
       </TaskPanel>

       <style>{`
        :root{ --bg:#0c0c0c; --panel:#151515; --panel2:#0f0f14; --text:#e8e8e8; --muted:#a7a7b0; --brand:#FA3356; --ring:rgba(250,51,86,.3); --radius:16px; }
        .ov{ color:var(--text); font: 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .ov-shell{ background:linear-gradient(180deg, var(--panel), var(--panel2)); border:1px solid #24242a; border-radius:16px; padding:12px; box-shadow: 0 12px 40px rgba(0,0,0,.35) }
        .ov-head{ display:flex; align-items:center; gap:12px; margin-bottom:10px; }
        .ov-head h3{ margin:0; font-weight:650; flex:0 0 auto }
        .ov-head__actions{ display:flex; gap:8px; margin-left:auto }
        .ov-btn{ appearance:none; border:1px solid #272733; background:#141419; color:var(--text); padding:8px 12px; border-radius:12px; cursor:pointer }
        .ov-btn--primary{ border-color:transparent; background:linear-gradient(180deg, var(--brand), #b32440) }
        .ov-btn:hover{ filter:brightness(1.05) }
        .ov-head__stats{ display:flex; gap:8px; align-items:center }
        .ov-stat{ display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:999px; background:#101015; border:1px solid #22222a; color:#c8c8d0 }
        .ov-stat strong{ font-weight:800 }
        .ov-stat.is-warn{ border-color:rgba(180,61,61,.35); background:rgba(180,61,61,.08); color:#f4c9cf }

        .ov-quickAdd{ display:grid; grid-template-columns: 1fr 120px 96px; gap:8px }
        @media(max-width:700px){ .ov-quickAdd{ grid-template-columns: 1fr 110px 92px } }
        .ov-quickAdd input, .ov-quickAdd select{ background:#0e0e12; color:var(--text); border:1px solid #262630; border-radius:12px; padding:10px 12px; outline:none }
        .ov-quickAdd input:focus, .ov-quickAdd select:focus{ border-color:var(--brand); box-shadow:0 0 0 6px var(--ring) }

        .ov-grid{ display:grid; grid-template-columns: minmax(220px, 280px) 1fr 1fr; gap:12px; margin-top:12px }
        @media(max-width:1100px){ .ov-grid{ grid-template-columns: minmax(220px, 280px) 1fr } }
        @media(max-width:700px){ .ov-grid{ grid-template-columns: 1fr } }
        @media(max-width:1100px){ .ov-grid{ grid-template-columns: 1fr 1fr } }
        @media(max-width:700px){ .ov-grid{ grid-template-columns: 1fr } }

        .ov-card{ background:linear-gradient(180deg, var(--panel), var(--panel2)); border:1px solid #24242a; border-radius:var(--radius); padding:10px }
        .ov-card.ov-map{ padding:0; overflow:hidden }
        .ov-card.ov-map .column-5{ height:100%; }
        .ov-map__empty{ display:flex; align-items:center; justify-content:center; min-height:240px; color:var(--muted); font-size:13px }
        .ov-card header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
        .ov-card h4{ margin:0; font-weight:650 }
        .ov-pill{ font-size:12px; padding:4px 8px; border-radius:999px; background:#1a1a22; border:1px solid #2a2a33; color:#c8c8d0 }

        .ov-row{ display:flex; align-items:center; justify-content:space-between; padding:8px; border-radius:12px; border:1px solid #22222a; background:#0f0f13; gap:8px; margin-bottom:8px }
        .ov-row__left{ display:flex; align-items:center; gap:8px; min-width:0 }
        .ov-row__title{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
        .ov-row__right{ display:flex; align-items:center; gap:10px }
        .ov-row__due{ color:var(--muted); font-size:12px }

        .ov-avatar{ width:24px; height:24px; border-radius:50%; display:grid; place-items:center; background:#22222a; border:1px solid #2f2f36; font-size:11px }

        .ov-chip{ font-size:12px; padding:2px 8px; border-radius:999px; background:#1a1a22; border:1px solid #2a2a33 }
        .ov-chip--warn{ color:#f1e0c4; border-color:rgba(166,126,30,.35); background:rgba(166,126,30,.08) }
        .ov-chip--danger{ color:#f4c9cf; border-color:rgba(180,61,61,.35); background:rgba(180,61,61,.08) }

        .ov-empty{ color:var(--muted); padding:8px 10px }

                /* Drawer / Sheet */
        .ov-panel{ position:fixed; inset:0; pointer-events:none; z-index:50 }
        .ov-panel.is-open{ pointer-events:auto }
        .ov-panel__scrim{ position:absolute; inset:0; background:rgba(0,0,0,.5); opacity:0; transition:opacity .2s ease }
        .ov-panel.is-open .ov-panel__scrim{ opacity:1 }
        .ov-panel__body{ position:absolute; background:linear-gradient(180deg, var(--panel), var(--panel2)); border-top:1px solid #24242a; box-shadow:0 -20px 60px rgba(0,0,0,.45); display:flex; flex-direction:column; border-top-left-radius:16px; border-top-right-radius:16px; will-change:transform; transition: transform .28s cubic-bezier(.2,.8,.2,1) }
        .ov-panel.is-open.is-drawer .ov-panel__body{ right:0; top:0; bottom:0; width:min(520px, 90vw); transform:translateX(0) }
        .ov-panel.is-sheet .ov-panel__body{ left:0; right:0; bottom:0; top:auto; transform:translateY(100%); width:100vw; max-height:100vh }
        .ov-panel.is-open.is-sheet .ov-panel__body{ transform:translateY(0) }
        .ov-panel__head{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #24242a }
        .ov-panel__content{ padding:10px 14px; overflow:auto }
        .ov-panel__lists h4{ margin:10px 0 8px 0 }
        .ov-panel__cta{ display:flex; justify-content:flex-end; padding:8px 0 }
        .ov-quickWrap{ display:flex; gap:8px; align-items:center; padding:8px; border:1px solid #24242a; background:linear-gradient(180deg, #111114, #0c0c0f); border-radius:14px; margin:6px 0 8px }
        .ov-quickLabel{ color:var(--muted); font-size:12px; padding:0 4px }
        .ov-quickAdd input, .ov-quickAdd select{ background:#0e0e12; color:var(--text); border:1px solid #262630; border-radius:10px; padding:8px 10px; outline:none; height:36px }
        .ov-btn{ height:36px }
        .ov-map{ position:sticky; top:8px }
        .ov-panel__grab{ align-self:center; width:56px; height:6px; border-radius:999px; background:#2a2a32; margin:8px 0 2px }
        .ov-panel__mapWide{ height:40vh; min-height:240px; max-height:55vh; border-radius:12px; border:1px solid #23232a; background:#0f0f13; margin:8px 14px 6px }
       `}</style>
     </div>
   );
 }
