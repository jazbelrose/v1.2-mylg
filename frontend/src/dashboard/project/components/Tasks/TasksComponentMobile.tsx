import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus, MapPin, Calendar } from "lucide-react";

import LeafletMap from "@/shared/ui/Map";
import { createTask, fetchTasks } from "@/shared/utils/api";
import LocationComponent from "@/dashboard/project/components/Shared/LocationComponent";

import styles from "./TasksComponentMobile.module.css";

type Status = "todo" | "in_progress" | "done" | string;

type Project = {
  projectId?: string;
  title?: string;
  thumbnails?: string[];
  address?: string;
  location?: { lat: number; lng: number };
};

type RawTask = {
  taskId?: string;
  id?: string;
  projectId?: string;
  title?: string;
  name?: string;
  description?: string;
  status?: Status;
  dueAt?: string | number | Date;
  due_at?: string | number | Date;
  dueDate?: string | number | Date;
  due_date?: string | number | Date;
  due?: string | number | Date;
  location?: unknown;
  address?: string;
  [key: string]: unknown;
};

type QuickTask = {
  id: string;
  title: string;
  description?: string;
  status: Status;
  dueDate: Date | null;
  address?: string;
  location?: { lat: number; lng: number } | null;
};

type TasksComponentMobileProps = {
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  activeProject?: Project;
  onActiveProjectChange?: (project: Project) => void;
};

const dueFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  weekday: "short",
});

const DEFAULT_LOCATION = { lat: 37.0902, lng: -95.7129 };

const SNAP_POINTS = {
  collapsed: 0.2,
  mid: 0.5,
  expanded: 1,
} as const;

type SnapPointKey = keyof typeof SNAP_POINTS;

const SNAP_SEQUENCE: SnapPointKey[] = ["collapsed", "mid", "expanded"];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function parseDueDate(value?: unknown): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    const copy = new Date(value.getTime());
    return Number.isNaN(copy.getTime()) ? null : copy;
  }

  if (typeof value === "number") {
    const byNumber = new Date(value);
    return Number.isNaN(byNumber.getTime()) ? null : byNumber;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const iso = new Date(`${trimmed}T00:00:00`);
      return Number.isNaN(iso.getTime()) ? null : iso;
    }
  }

  return null;
}

function parseLocation(value: unknown): { lat: number; lng: number } | null {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 2) {
    const [latRaw, lngRaw] = value;
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  if (typeof value === "object") {
    const latCandidate = (value as Record<string, unknown>).lat ??
      (value as Record<string, unknown>).latitude ??
      (value as Record<string, unknown>).y;
    const lngCandidate = (value as Record<string, unknown>).lng ??
      (value as Record<string, unknown>).lon ??
      (value as Record<string, unknown>).longitude ??
      (value as Record<string, unknown>).x;
    const lat = Number(latCandidate);
    const lng = Number(lngCandidate);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parseLocation(parsed);
    } catch {
      const [latPart, lngPart] = value.split(/[\,\s]+/);
      const lat = Number(latPart);
      const lng = Number(lngPart);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  return null;
}

function normalizeTask(raw: RawTask): QuickTask | null {
  const id = raw.taskId || raw.id;
  const title = (raw.title || raw.name || "").toString().trim();
  if (!id) return null;

  return {
    id,
    title: title || "Untitled task",
    description: typeof raw.description === "string" ? raw.description : undefined,
    status: (raw.status as Status) || "todo",
    dueDate: parseDueDate(
      raw.dueAt ?? raw.due_at ?? raw.dueDate ?? raw.due_date ?? raw.due,
    ),
    address: typeof raw.address === "string" ? raw.address : undefined,
    location: parseLocation(raw.location),
  };
}

function formatDueLabel(task: QuickTask): string {
  if (!task.dueDate) return "No due date";
  return dueFormatter.format(task.dueDate);
}

function computeStats(tasks: QuickTask[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inSevenDays = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  let completed = 0;
  let overdue = 0;
  let dueSoon = 0;

  tasks.forEach((task) => {
    if (task.status === "done") {
      completed += 1;
      return;
    }

    if (!task.dueDate) return;

    if (task.dueDate < startOfToday) {
      overdue += 1;
    } else if (task.dueDate <= inSevenDays) {
      dueSoon += 1;
    }
  });

  return { completed, overdue, dueSoon };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMarkerThumbnail(color?: string) {
  if (!color) return undefined;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="4"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const getNearestSnapPoint = (ratio: number): SnapPointKey => {
  let nearest: SnapPointKey = "collapsed";
  let smallestDiff = Number.POSITIVE_INFINITY;
  (Object.entries(SNAP_POINTS) as [SnapPointKey, number][]).forEach(([key, value]) => {
    const diff = Math.abs(value - ratio);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      nearest = key;
    }
  });
  return nearest;
};

const TasksComponentMobile: React.FC<TasksComponentMobileProps> = ({
  projectId = "",
  projectName,
  projectColor,
  activeProject,
  onActiveProjectChange,
}) => {
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SnapPointKey>("collapsed");
  const [sheetRatio, setSheetRatio] = useState<number>(SNAP_POINTS.collapsed);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const dragStateRef = useRef<{
    pointerId: number | null;
    startY: number;
    startRatio: number;
    moved: boolean;
  }>({ pointerId: null, startY: 0, startRatio: SNAP_POINTS.collapsed, moved: false });

  const taskRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const refreshTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchTasks(projectId);
      const normalized = (response || [])
        .map((raw: RawTask) => normalizeTask(raw))
        .filter((task): task is QuickTask => Boolean(task));
      setTasks(normalized);
    } catch (err) {
      console.error("Failed to load project tasks", err);
      setError("We couldn't load tasks for this project. Please try again.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refreshTasks();
  }, [refreshTasks]);

  useEffect(() => {
    if (focusedTaskId && !tasks.some((task) => task.id === focusedTaskId)) {
      setFocusedTaskId(null);
    }
  }, [focusedTaskId, tasks]);

  const stats = useMemo(() => computeStats(tasks), [tasks]);

  const formatStatValue = (value: number): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value;
  };

  const drawerTasks = useMemo(() => {
    return tasks
      .slice()
      .sort((a, b) => {
        const aTime = a.dueDate ? a.dueDate.getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.dueDate ? b.dueDate.getTime() : Number.POSITIVE_INFINITY;
        if (aTime === bTime) return a.title.localeCompare(b.title);
        return aTime - bTime;
      });
  }, [tasks]);

  const mapTasks = useMemo(
    () => tasks.filter((task) => task.location && !Number.isNaN(task.location.lat) && !Number.isNaN(task.location.lng)),
    [tasks],
  );

  const mapLocation = activeProject?.location ?? mapTasks[0]?.location ?? DEFAULT_LOCATION;
  const mapAddress =
    activeProject?.address ?? mapTasks[0]?.address ?? projectName ?? "Project";

  const mapMarkers = useMemo(
    () =>
      mapTasks.map((task) => ({
        id: task.id,
        lat: task.location!.lat,
        lng: task.location!.lng,
        thumbnail: buildMarkerThumbnail(projectColor),
        label: task.title,
      })),
    [mapTasks, projectColor],
  );

  const statusMessage = useMemo(() => {
    if (error) return "We couldn’t load tasks right now.";
    if (loading) return "Loading tasks…";
    if (!tasks.length) return "No tasks for this project yet.";

    const openTasks = tasks.filter((task) => task.status !== "done");
    if (!openTasks.length) return "You're all caught up.";

    const datedTasks = openTasks.filter((task): task is QuickTask & { dueDate: Date } => Boolean(task.dueDate));
    if (!datedTasks.length) {
      const noun = openTasks.length === 1 ? "task" : "tasks";
      return `${openTasks.length} open ${noun} with no due date yet.`;
    }

    const sorted = datedTasks
      .slice()
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const nextDue = sorted[0];
    const sameDayCount = sorted.filter((task) => isSameDay(task.dueDate, nextDue.dueDate)).length;
    const noun = sameDayCount === 1 ? "task" : "tasks";
    return `${sameDayCount} ${noun} due ${dueFormatter.format(nextDue.dueDate)}.`;
  }, [error, loading, tasks]);

  const cycleSnapPoint = useCallback(() => {
    setSheetSnap((current) => {
      const currentIndex = SNAP_SEQUENCE.indexOf(current);
      const nextIndex = (currentIndex + 1) % SNAP_SEQUENCE.length;
      return SNAP_SEQUENCE[nextIndex];
    });
  }, []);

  useEffect(() => {
    if (isDraggingSheet) return;
    setSheetRatio(SNAP_POINTS[sheetSnap]);
  }, [sheetSnap, isDraggingSheet]);

  const updateSheetFromPointer = useCallback((clientY: number) => {
    if (typeof window === "undefined") return;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight ?? 1;
    if (!viewportHeight) return;

    const { startY, startRatio } = dragStateRef.current;
    const delta = clientY - startY;
    const desired = startRatio * viewportHeight - delta;
    const ratio = clamp(desired / viewportHeight, SNAP_POINTS.collapsed, SNAP_POINTS.expanded);
    setSheetRatio(ratio);
  }, []);

  const handleHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startRatio: sheetRatio,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingSheet(true);
  };

  const handleHandlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSheet || dragStateRef.current.pointerId !== event.pointerId) return;
    if (!dragStateRef.current.moved) {
      const delta = Math.abs(event.clientY - dragStateRef.current.startY);
      if (delta > 6) {
        dragStateRef.current.moved = true;
      }
    }
    updateSheetFromPointer(event.clientY);
  };

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSheet || dragStateRef.current.pointerId !== event.pointerId) {
      return false;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDraggingSheet(false);
    const ratio = clamp(sheetRatio, SNAP_POINTS.collapsed, SNAP_POINTS.expanded);
    const nearest = getNearestSnapPoint(ratio);
    setSheetSnap(nearest);
    setSheetRatio(SNAP_POINTS[nearest]);
    const moved = dragStateRef.current.moved;
    dragStateRef.current = { pointerId: null, startY: 0, startRatio: SNAP_POINTS[nearest], moved: false };
    return moved;
  };

  const handleHandlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const moved = finishDrag(event);
    if (!moved) {
      cycleSnapPoint();
    }
  };

  const handleHandlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(event);
  };

  const handleHandleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      cycleSnapPoint();
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSheetSnap((current) => {
        if (current === "expanded") return current;
        if (current === "mid") return "expanded";
        return "mid";
      });
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSheetSnap((current) => {
        if (current === "collapsed") return current;
        if (current === "mid") return "collapsed";
        return "mid";
      });
    }
  };

  const handleMarkerSelect = useCallback((taskId: string) => {
    setFocusedTaskId(taskId);
    setSheetSnap((current) => (current === "expanded" ? current : "mid"));
  }, []);

  const handleTaskSelect = useCallback(
    (task: QuickTask) => {
      setFocusedTaskId(task.id);
      if (task.location) {
        setSheetSnap((current) => (current === "collapsed" ? "mid" : current));
      }
    },
    [],
  );

  useEffect(() => {
    if (!focusedTaskId || sheetSnap === "collapsed") return;
    const element = taskRefs.current.get(focusedTaskId);
    if (!element) return;
    window.requestAnimationFrame(() => {
      element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [focusedTaskId, sheetSnap]);

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSuccessMessage(null);
      setFormError("Give the task a name before saving.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);

    let dueIso: string | undefined;
    if (dueDate) {
      const parsed = new Date(`${dueDate}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        dueIso = parsed.toISOString();
      }
    }

    try {
      await createTask({
        projectId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        dueDate: dueIso,
        status: "todo",
      });
      setSuccessMessage("Task created. It'll appear here shortly.");
      setTitle("");
      setDescription("");
      setDueDate("");
      void refreshTasks();
    } catch (err) {
      console.error("Failed to create project task", err);
      setFormError("We couldn't create that task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const mapStatus = error
    ? "We couldn't load locations for these tasks."
    : loading
      ? "Loading tasks…"
      : mapTasks.length
        ? null
        : "Add locations to your tasks to see them appear on the map.";

  const sheetTransform = `${(1 - sheetRatio) * 100}%`;

  return (
    <div className={styles.container} aria-label="Project tasks map view">
      <div className={styles.mapLayer} aria-hidden={false}>
        <LeafletMap
          location={mapLocation}
          address={mapAddress}
          scrollWheelZoom={true}
          dragging={true}
          touchZoom={true}
          showUserLocation={false}
          markers={mapMarkers}
          onMarkerSelect={handleMarkerSelect}
          activeMarkerId={focusedTaskId}
        />
        {mapStatus ? <div className={styles.mapMessage}>{mapStatus}</div> : null}
      </div>

      <div className={styles.sheet}>
        <div
          className={styles.sheetSurface}
          style={{ transform: `translateY(${sheetTransform})`, transition: isDraggingSheet ? "none" : undefined }}
        >
          <div
            className={styles.sheetHandle}
            role="button"
            tabIndex={0}
            aria-label="Drag to resize the task panel"
            onPointerDown={handleHandlePointerDown}
            onPointerMove={handleHandlePointerMove}
            onPointerUp={handleHandlePointerUp}
            onPointerCancel={handleHandlePointerCancel}
            onKeyDown={handleHandleKeyDown}
          >
            <span className={styles.sheetGrabber} />
          </div>

          <header className={styles.sheetHeader}>
            <div className={styles.headingGroup}>
              <h3 className={styles.title}>Tasks</h3>
              <p className={styles.subtitle}>
                {projectName
                  ? `Keep ${projectName} moving forward.`
                  : "Keep this project moving forward."}
              </p>
            </div>
          </header>

          <div className={styles.sheetContent}>
            <div className={styles.scrollRegion}>
              <section className={styles.section} aria-label="Project status">
                <div className={styles.statRow} aria-label="Task summary">
                  <div className={`${styles.statCard} ${styles.statOk}`}>
                    <span className={styles.statValue}>{formatStatValue(stats.completed)}</span>
                    <span className={styles.statLabel}>Done</span>
                  </div>
                  <div className={`${styles.statCard} ${styles.statDanger}`}>
                    <span className={styles.statValue}>{formatStatValue(stats.overdue)}</span>
                    <span className={styles.statLabel}>Overdue</span>
                  </div>
                  <div className={`${styles.statCard} ${styles.statWarn}`}>
                    <span className={styles.statValue}>{formatStatValue(stats.dueSoon)}</span>
                    <span className={styles.statLabel}>Due soon</span>
                  </div>
                </div>
                <p className={styles.status}>{statusMessage}</p>
              </section>

              {activeProject && onActiveProjectChange ? (
                <section className={styles.section} aria-label="Project location">
                  <div className={styles.locationContainer}>
                    <LocationComponent
                      activeProject={activeProject}
                      onActiveProjectChange={onActiveProjectChange}
                    />
                  </div>
                </section>
              ) : null}

              <section className={styles.section} aria-label="All project tasks">
                <h3 className={styles.sectionHeading}>Task list</h3>
                {error ? (
                  <div className={styles.error}>{error}</div>
                ) : loading ? (
                  <div className={styles.loading}>Loading tasks…</div>
                ) : drawerTasks.length ? (
                  <ul className={styles.taskList}>
                    {drawerTasks.map((task) => {
                      const isSelected = focusedTaskId === task.id;
                      return (
                        <li
                          key={task.id}
                          ref={(element) => {
                            if (!element) {
                              taskRefs.current.delete(task.id);
                            } else {
                              taskRefs.current.set(task.id, element);
                            }
                          }}
                          className={`${styles.taskItem} ${isSelected ? styles.taskItemActive : ""}`}
                        >
                          <button
                            type="button"
                            className={styles.taskButton}
                            onClick={() => handleTaskSelect(task)}
                          >
                            <div className={styles.taskTop}>
                              <span className={styles.taskTitle}>{task.title}</span>
                              <span className={styles.statusBadge}>
                                {task.status === "done"
                                  ? "Completed"
                                  : task.status.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className={styles.taskMeta}>
                              <span className={styles.metaLine}>
                                <Calendar size={14} aria-hidden="true" /> {formatDueLabel(task)}
                              </span>
                              {task.address ? (
                                <span className={styles.metaLine}>
                                  <MapPin size={14} aria-hidden="true" /> {task.address}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className={styles.empty}>No tasks yet. Create one to get started.</div>
                )}
              </section>

              <section className={styles.section} aria-label="Create a quick task">
                <h3 className={styles.sectionHeading}>Create quick task</h3>
                <form className={styles.createForm} onSubmit={handleCreateTask}>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Task name"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={submitting}
                  />
                  <textarea
                    className={styles.textarea}
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={submitting}
                  />
                  <input
                    type="date"
                    className={styles.dateInput}
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    disabled={submitting}
                  />
                  {formError ? <div className={styles.formError}>{formError}</div> : null}
                  {successMessage ? <div className={styles.successMessage}>{successMessage}</div> : null}
                  <div className={styles.formActions}>
                    <button type="submit" className={styles.submitButton} disabled={submitting}>
                      <Plus size={18} strokeWidth={2.5} />
                      Create task
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksComponentMobile;
