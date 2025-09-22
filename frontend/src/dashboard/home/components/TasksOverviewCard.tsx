import React, { useEffect, useMemo, useState } from "react";

import { useUser } from "@/app/contexts/useUser";

import { useTasksOverview } from "../hooks/useTasksOverview";

type Priority = "Low" | "Medium" | "High";
type Status = "To Do" | "In Progress" | "Done";

type OverviewTask = {
  id: string;
  title: string;
  assignee?: string;
  projectId?: string;
  project?: string;
  priority?: Priority;
  status: Status;
  dueDate?: Date;
  dueLabel?: string;
  time?: string;
  color?: string;
  source: "remote" | "local";
};

type TasksOverviewCardProps = {
  className?: string;
};

type ChipTone = "neutral" | "success" | "warn" | "danger";

const priorityTone = (priority: Priority): ChipTone => {
  switch (priority) {
    case "High":
      return "danger";
    case "Medium":
      return "warn";
    default:
      return "neutral";
  }
};

const computePriority = (dueDate?: Date): Priority => {
  if (!dueDate) return "Low";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = dueDate.getTime() - startOfToday.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (dueDate < startOfToday) {
    return "High";
  }

  if (diffDays <= 2) {
    return "Medium";
  }

  return "Low";
};

const generateId = () => {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `task-${Math.random().toString(36).slice(2)}`;
};

const formatDueLabel = (task: OverviewTask) => {
  if (task.dueDate instanceof Date && !Number.isNaN(task.dueDate.getTime())) {
    const base = task.dueDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    if (task.time) {
      return `${base} · ${task.time}`;
    }

    return base;
  }

  return task.dueLabel ?? "—";
};

const Avatar: React.FC<{ name?: string }> = ({ name }) => {
  if (!name) return null;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="ov-avatar" title={name} aria-label={`Assignee ${name}`}>
      {initials || "?"}
    </div>
  );
};

const Chip: React.FC<{ tone?: ChipTone; children: React.ReactNode }> = ({
  tone = "neutral",
  children,
}) => <span className={`ov-chip ov-chip--${tone}`}>{children}</span>;

function useResponsivePanel() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsMobile(false);
      return;
    }

    const query = window.matchMedia("(max-width: 820px)");
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return { open, setOpen, isMobile };
}

type QuickAddProps = {
  onAdd: (task: OverviewTask) => void;
  defaultAssignee: string;
  defaultProjectName?: string | null;
};

const QuickAdd: React.FC<QuickAddProps> = ({ onAdd, defaultAssignee, defaultProjectName }) => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");

  const save = () => {
    if (!title.trim()) return;

    onAdd({
      id: generateId(),
      title: title.trim(),
      assignee: defaultAssignee,
      project: defaultProjectName ?? undefined,
      priority,
      status: "To Do",
      source: "local",
    });

    setTitle("");
  };

  return (
    <div className="ov-quickAdd" role="form" aria-label="Quick add task">
      <input
        aria-label="Task title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Quick add a task…"
      />
      <select
        aria-label="Priority"
        value={priority}
        onChange={(event) => setPriority(event.target.value as Priority)}
      >
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      </select>
      <button type="button" className="ov-btn ov-btn--primary" onClick={save}>
        Add
      </button>
    </div>
  );
};

const Row: React.FC<{ task: OverviewTask }> = ({ task }) => (
  <div className="ov-row" title={task.title}>
    <div className="ov-row__left">
      {task.priority ? <Chip tone={priorityTone(task.priority)}>{task.priority}</Chip> : null}
      <span className="ov-row__title">{task.title}</span>
    </div>
    <div className="ov-row__right">
      <span className="ov-row__due">{formatDueLabel(task)}</span>
      <Avatar name={task.assignee} />
    </div>
  </div>
);

type TaskPanelProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  mode?: "sheet" | "drawer";
};

const TaskPanel: React.FC<TaskPanelProps> = ({ open, onClose, children, mode = "drawer" }) => (
  <div
    className={`ov-panel ${open ? "is-open" : ""} ${mode === "sheet" ? "is-sheet" : "is-drawer"}`.trim()}
    aria-hidden={!open}
  >
    <div className="ov-panel__scrim" onClick={onClose} />
    <div className="ov-panel__body" role="dialog" aria-modal="true" aria-label="Tasks">
      <div className="ov-panel__grab" aria-hidden="true" />
      <header className="ov-panel__head">
        <h3>Tasks</h3>
        <button type="button" className="ov-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      <div className="ov-panel__content">{children}</div>
    </div>
  </div>
);

const emptyMessage = (state: { loading: boolean; error: boolean }, fallback: string) => {
  if (state.error) {
    return "We couldn’t load tasks right now.";
  }
  if (state.loading) {
    return "Loading tasks…";
  }
  return fallback;
};

const TasksOverviewCard: React.FC<TasksOverviewCardProps> = ({ className }) => {
  const {
    loading,
    error,
    stats,
    groups,
    handleNavigateToPrimary,
    handleViewAll,
    canNavigateToProject,
    primaryProjectId,
    primaryProjectName,
  } = useTasksOverview();
  const { userName } = useUser();

  const currentUser = userName || "You";
  const { open, setOpen, isMobile } = useResponsivePanel();
  const [quickTasks, setQuickTasks] = useState<OverviewTask[]>([]);

  const remoteTasks = useMemo<OverviewTask[]>(() => {
    return groups.flatMap((group) =>
      group.items.map((item) => ({
        id: item.id,
        title: item.title,
        assignee: item.project ?? undefined,
        projectId: item.projectId,
        project: item.project,
        priority: computePriority(item.dueDate),
        status: "To Do",
        dueDate: item.dueDate,
        dueLabel: group.dayLabel,
        time: item.time,
        color: item.color,
        source: "remote" as const,
      })),
    );
  }, [groups]);

  const focusProjectId = canNavigateToProject ? primaryProjectId : null;

  const focusTasks = useMemo(() => {
    if (!remoteTasks.length) return [];
    if (!focusProjectId) return remoteTasks;
    return remoteTasks.filter((task) => task.projectId === focusProjectId);
  }, [focusProjectId, remoteTasks]);

  const otherTasks = useMemo(() => {
    if (!remoteTasks.length) return [];
    if (!focusProjectId) return [];
    return remoteTasks.filter((task) => task.projectId !== focusProjectId);
  }, [focusProjectId, remoteTasks]);

  const myTasks = useMemo(
    () => [
      ...quickTasks,
      ...(focusProjectId ? focusTasks : remoteTasks),
    ],
    [focusProjectId, focusTasks, quickTasks, remoteTasks],
  );

  const teamTasks = useMemo(() => (focusProjectId ? otherTasks : []), [focusProjectId, otherTasks]);

  const addQuickTask = (task: OverviewTask) => {
    setQuickTasks((prev) => [task, ...prev]);
  };

  const state = { loading, error };

  const formatStatValue = (value: number, extras = 0): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value + extras;
  };

  const overdueWarning = !error && !loading && stats.overdue > 0;
  const totalBase = stats.completed + stats.dueSoon + stats.overdue;

  const renderTaskPreview = (tasks: OverviewTask[], fallback: string) => {
    if (error) {
      return <div className="ov-empty">We couldn’t load tasks right now.</div>;
    }
    if (loading && !tasks.length) {
      return <div className="ov-empty">Loading tasks…</div>;
    }
    if (!tasks.length) {
      return <div className="ov-empty">{fallback}</div>;
    }

    return tasks.slice(0, 4).map((task) => <Row key={task.id} task={task} />);
  };

  const renderPanelList = (tasks: OverviewTask[], fallback: string) => {
    if (error && !tasks.length) {
      return <div className="ov-empty">We couldn’t load tasks right now.</div>;
    }
    if (loading && !tasks.length) {
      return <div className="ov-empty">Loading tasks…</div>;
    }
    if (!tasks.length) {
      return <div className="ov-empty">{fallback}</div>;
    }

    return tasks.map((task) => <Row key={task.id} task={task} />);
  };

  return (
    <section className={className} aria-label="Tasks overview">
      <div className="ov ov-shell">
        <div className="ov-head">
          <div>
            <h3>Tasks</h3>
            <p className="ov-head__subtitle">Track progress and deadlines across your projects.</p>
          </div>
          <div className="ov-head__stats">
            <span className="ov-stat">
              <strong>{formatStatValue(stats.completed)}</strong>
              <span> Completed</span>
            </span>
            <span className={`ov-stat ${overdueWarning ? "is-warn" : ""}`.trim()}>
              <strong>{formatStatValue(stats.overdue)}</strong>
              <span> Overdue</span>
            </span>
            <span className="ov-stat">
              <strong>{formatStatValue(totalBase, quickTasks.length)}</strong>
              <span> Total</span>
            </span>
          </div>
          <div className="ov-head__actions">
            <button type="button" className="ov-btn" onClick={() => setOpen(true)}>
              Open
            </button>
            <button
              type="button"
              className="ov-btn ov-btn--primary"
              onClick={handleNavigateToPrimary}
              disabled={!canNavigateToProject}
            >
              New Task
            </button>
          </div>
        </div>

        <div className="ov-quickWrap">
          <span className="ov-quickLabel">Quick Task</span>
          <QuickAdd
            onAdd={addQuickTask}
            defaultAssignee={currentUser}
            defaultProjectName={primaryProjectName}
          />
        </div>

        <div className="ov-grid">
          <section className="ov-card ov-map">
            <div className="ov-map__inner" aria-hidden="true" />
          </section>
          <section className="ov-card">
            <header>
              <h4>My Tasks</h4>
              <span className="ov-pill">{formatStatValue(myTasks.length, 0)}</span>
            </header>
            {renderTaskPreview(myTasks, "Nothing yet—create your first task.")}
          </section>
          <section className="ov-card">
            <header>
              <h4>Team Tasks</h4>
              <span className="ov-pill">{formatStatValue(teamTasks.length, 0)}</span>
            </header>
            {focusProjectId
              ? renderTaskPreview(teamTasks, "No team tasks.")
              : renderTaskPreview([], emptyMessage(state, "No team tasks."))}
          </section>
        </div>

        <TaskPanel open={open} onClose={() => setOpen(false)} mode={isMobile ? "sheet" : "drawer"}>
          <div className="ov-panel__mapWide" aria-hidden="true" />
          <QuickAdd
            onAdd={addQuickTask}
            defaultAssignee={currentUser}
            defaultProjectName={primaryProjectName}
          />
          <div className="ov-panel__lists">
            <h4>My Tasks</h4>
            {renderPanelList(myTasks, "Nothing yet—create your first task.")}
            <h4 style={{ marginTop: 16 }}>Team Tasks</h4>
            {focusProjectId
              ? renderPanelList(teamTasks, "No team tasks.")
              : renderPanelList([], emptyMessage(state, "No team tasks."))}
            <div className="ov-panel__cta">
              <button type="button" className="ov-btn ov-btn--primary" onClick={handleViewAll}>
                Go to full Task page →
              </button>
            </div>
          </div>
        </TaskPanel>

        <style>{`
        :root{ --bg:#0c0c0c; --panel:#151515; --panel2:#0f0f14; --text:#e8e8e8; --muted:#a7a7b0; --brand:#FA3356; --ring:rgba(250,51,86,.3); --radius:16px; }
        .ov{ color:var(--text); font: 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
        .ov-shell{ background:linear-gradient(180deg, var(--panel), var(--panel2)); border:1px solid #24242a; border-radius:16px; padding:12px; box-shadow: 0 12px 40px rgba(0,0,0,.35) }
        .ov-head{ display:flex; align-items:center; gap:12px; margin-bottom:10px; flex-wrap:wrap }
        .ov-head h3{ margin:0; font-weight:650; flex:0 0 auto }
        .ov-head__subtitle{ margin:0; font-size:12px; color:var(--muted) }
        .ov-head__actions{ display:flex; gap:8px; margin-left:auto }
        .ov-btn{ appearance:none; border:1px solid #272733; background:#141419; color:var(--text); padding:8px 12px; border-radius:12px; cursor:pointer }
        .ov-btn--primary{ border-color:transparent; background:linear-gradient(180deg, var(--brand), #b32440) }
        .ov-btn:disabled{ opacity:.5; cursor:not-allowed }
        .ov-btn:hover:not(:disabled){ filter:brightness(1.05) }
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

        .ov-panel{ position:fixed; inset:0; pointer-events:none; z-index:50 }
        .ov-panel.is-open{ pointer-events:auto }
        .ov-panel__scrim{ position:absolute; inset:0; background:rgba(0,0,0,.5); opacity:0; transition:opacity .2s ease }
        .ov-panel.is-open .ov-panel__scrim{ opacity:1 }
        .ov-panel__body{ position:absolute; background:linear-gradient(180deg, var(--panel), var(--panel2)); border-top:1px solid #24242a; box-shadow:0 -20px 60px rgba(0,0,0,.45); display:flex; flex-direction:column; border-top-left-radius:16px; border-top-right-radius:16px; will-change:transform; transition: transform .28s cubic-bezier(.2,.8,.2,1) }
        .ov-panel.is-open.is-drawer .ov-panel__body{ right:0; top:0; bottom:0; width:min(520px, 90vw); transform:translateX(0) }
        .ov-panel.is-drawer .ov-panel__body{ right:0; top:0; bottom:0; width:min(520px, 90vw); transform:translateX(100%) }
        .ov-panel.is-sheet .ov-panel__body{ left:0; right:0; bottom:0; top:auto; transform:translateY(100%); width:100vw; max-height:100vh }
        .ov-panel.is-open.is-sheet .ov-panel__body{ transform:translateY(0) }
        .ov-panel__head{ display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid #24242a }
        .ov-panel__content{ padding:10px 14px; overflow:auto }
        .ov-panel__lists h4{ margin:10px 0 8px 0 }
        .ov-panel__cta{ display:flex; justify-content:flex-end; padding:8px 0 }
        .ov-quickWrap{ display:flex; gap:8px; align-items:center; padding:8px; border:1px solid #24242a; background:linear-gradient(180deg, #111114, #0c0c0f); border-radius:14px; margin:6px 0 8px }
        .ov-quickLabel{ color:var(--muted); font-size:12px; padding:0 4px }
        .ov-btn{ height:36px }
        .ov-map{ position:sticky; top:8px }
        .ov-map__inner{ aspect-ratio:4 / 3; width:100%; border-radius:12px; border:1px solid #23232a; overflow:hidden; background:#0f0f12 }
        .ov-panel__grab{ align-self:center; width:56px; height:6px; border-radius:999px; background:#2a2a32; margin:8px 0 2px }
        .ov-panel__mapWide{ height:40vh; min-height:240px; max-height:55vh; border-radius:12px; border:1px solid #23232a; background:#0f0f13; margin:8px 14px 6px }
        @media(max-width:700px){ .ov-head{ flex-direction:column; align-items:flex-start } .ov-head__actions{ margin-left:0 } .ov-head__stats{ width:100%; justify-content:space-between } }
       `}</style>
      </div>
    </section>
  );
};

export default TasksOverviewCard;
