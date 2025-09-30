import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, MapPin, Calendar, ChevronDown, User } from "lucide-react";
import { motion } from "framer-motion";

import Map from "@/shared/ui/Map";
import { createTask, fetchTasks } from "@/shared/utils/api";
import QuickCreateTaskModal, {
  type QuickCreateTaskModalProject,
} from "@/dashboard/home/components/QuickCreateTaskModal";

import styles from "./TasksComponentMobile.module.css";

type Status = "todo" | "in_progress" | "done" | string;

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
  assigneeId?: string;
  assignedTo?: string;
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
  assignedTo?: string;
};

type TasksComponentMobileProps = {
  projectId?: string;
  projectName?: string;
  projectColor?: string;
};

const dueFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  weekday: "short",
});

const DEFAULT_LOCATION = { lat: 37.0902, lng: -95.7129 }; // Geographic centre of contiguous US
const SNAP_POINTS = [0.2, 0.5, 1] as const;
type SnapIndex = 0 | 1 | 2;

function getViewportHeight(): number {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

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
      const [latPart, lngPart] = value.split(/[,\s]+/);
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
    assignedTo:
      typeof raw.assigneeId === "string"
        ? raw.assigneeId
        : typeof raw.assignedTo === "string"
          ? raw.assignedTo
          : undefined,
  };
}

function formatDueLabel(task: QuickTask): string {
  if (!task.dueDate) return "No due date";
  return dueFormatter.format(task.dueDate);
}

function formatAssigneeDisplay(value?: string): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const doubleUnderscoreIndex = trimmed.indexOf("__");
  const base =
    doubleUnderscoreIndex >= 0 ? trimmed.slice(0, doubleUnderscoreIndex) : trimmed;

  const formatted = base.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return formatted || undefined;
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

const TasksComponentMobile: React.FC<TasksComponentMobileProps> = ({
  projectId = "",
  projectName,
  projectColor,
}) => {
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [snapIndex, setSnapIndex] = useState<SnapIndex>(1);
  const [viewportHeight, setViewportHeight] = useState(() => getViewportHeight());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const taskListRef = useRef<HTMLUListElement | null>(null);
  const initialScrollDoneRef = useRef(false);

  const quickCreateProjects = useMemo<QuickCreateTaskModalProject[]>(() => {
    if (!projectId || !projectName) {
      return [];
    }

    return [{ id: projectId, name: projectName }];
  }, [projectId, projectName]);
  const hasQuickCreateProject = quickCreateProjects.length > 0;

  const handleOpenDrawer = useCallback(() => {
    setDrawerOpen(true);
    setFormError(null);
    setSuccessMessage(null);
    // Start the sheet in the mid snap-point so tasks are visible immediately.
    setSnapIndex(1);
    initialScrollDoneRef.current = false;
    setViewportHeight(getViewportHeight());
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setFormError(null);
    setSnapIndex(1);
    setActiveTaskId(null);
    setMapFocus(null);
    initialScrollDoneRef.current = false;
  }, []);

  const handleOpenQuickCreate = useCallback(() => {
    if (!hasQuickCreateProject) return;
    setQuickCreateOpen(true);
  }, [hasQuickCreateProject]);

  const handleCloseQuickCreate = useCallback(() => {
    setQuickCreateOpen(false);
  }, []);

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
    if (!hasQuickCreateProject) {
      setQuickCreateOpen(false);
    }
  }, [hasQuickCreateProject]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, handleCloseDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const update = () => setViewportHeight(getViewportHeight());
    update();
    window.addEventListener("resize", update);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      viewport?.removeEventListener("resize", update);
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen || typeof document === "undefined") return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

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

  const mapLocation = mapTasks[0]?.location ?? DEFAULT_LOCATION;
  const mapAddress = mapTasks[0]?.address ?? projectName ?? "Project";

  const markerThumbnail = useMemo(() => buildMarkerThumbnail(projectColor), [projectColor]);

  const mapMarkers = useMemo(
    () =>
      mapTasks.map((task) => ({
        id: task.id,
        lat: task.location!.lat,
        lng: task.location!.lng,
        iconUrl: markerThumbnail,
        title: task.title,
        isActive: task.id === activeTaskId,
      })),
    [mapTasks, markerThumbnail, activeTaskId],
  );

  useEffect(() => {
    if (!drawerOpen) return;
    const existingIds = new Set(drawerTasks.map((task) => task.id));
    if (activeTaskId && existingIds.has(activeTaskId)) {
      return;
    }

    initialScrollDoneRef.current = false;

    if (mapTasks.length) {
      setActiveTaskId(mapTasks[0].id);
    } else if (drawerTasks.length) {
      setActiveTaskId(drawerTasks[0].id);
    } else {
      setActiveTaskId(null);
    }
  }, [drawerOpen, drawerTasks, mapTasks, activeTaskId]);

  useEffect(() => {
    if (!drawerOpen) return;
    if (!activeTaskId) {
      setMapFocus(null);
      return;
    }

    const locatedTask = mapTasks.find((task) => task.id === activeTaskId);
    if (!locatedTask?.location) {
      setMapFocus(null);
      return;
    }

    setMapFocus(locatedTask.location);

    if (typeof window === "undefined") return;
    const timeout = window.setTimeout(() => setMapFocus(null), 420);
    return () => window.clearTimeout(timeout);
  }, [activeTaskId, mapTasks, drawerOpen]);

  useEffect(() => {
    if (!drawerOpen || !activeTaskId || !taskListRef.current) return;
    const container = taskListRef.current;
    const target = container.querySelector<HTMLLIElement>(`[data-task-id="${activeTaskId}"]`);
    if (!target) return;

    const behavior: ScrollBehavior = initialScrollDoneRef.current ? "smooth" : "auto";
    target.scrollIntoView({ block: "center", behavior });
    initialScrollDoneRef.current = true;
  }, [activeTaskId, drawerOpen]);

  const sheetHeights = useMemo(() => SNAP_POINTS.map((point) => viewportHeight * point), [viewportHeight]);
  const targetY = viewportHeight ? viewportHeight - sheetHeights[snapIndex] : 0;
  const maxDragOffset = Math.max(0, viewportHeight - sheetHeights[0]);
  const hasMapMarkers = mapMarkers.length > 0;
  const selectedTask = useMemo(
    () => drawerTasks.find((task) => task.id === activeTaskId) ?? null,
    [drawerTasks, activeTaskId],
  );
  const selectedAssigneeName = formatAssigneeDisplay(selectedTask?.assignedTo);

  const handleMarkerClick = useCallback((markerId: string) => {
    setActiveTaskId(markerId);
    setSnapIndex((current) => (current === 0 ? 1 : current));
  }, []);

  const handleTaskSelect = useCallback((taskId: string) => {
    setActiveTaskId(taskId);
    setSnapIndex((current) => (current === 0 ? 1 : current));
  }, []);

  const handleHandleClick = useCallback(() => {
    setSnapIndex((current) => {
      if (current === 2) return 1;
      if (current === 1) return 2;
      return 1;
    });
  }, []);

  const handleSnapToNearest = useCallback(() => {
    if (!sheetRef.current || !viewportHeight) return;
    const rect = sheetRef.current.getBoundingClientRect();
    const visibleHeight = viewportHeight - rect.top;
    if (visibleHeight < viewportHeight * 0.16) {
      handleCloseDrawer();
      return;
    }

    const ratio = visibleHeight / viewportHeight;
    let closestIndex: SnapIndex = 0;
    let smallestDistance = Number.POSITIVE_INFINITY;

    SNAP_POINTS.forEach((point, index) => {
      const diff = Math.abs(point - ratio);
      if (diff < smallestDistance) {
        smallestDistance = diff;
        closestIndex = index as SnapIndex;
      }
    });

    setSnapIndex(closestIndex);
  }, [viewportHeight, handleCloseDrawer]);

  const handleDragEnd = useCallback(() => {
    handleSnapToNearest();
  }, [handleSnapToNearest]);

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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
  };

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
      resetForm();
      void refreshTasks();
    } catch (err) {
      console.error("Failed to create project task", err);
      setFormError("We couldn't create that task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderDrawer = () => {
    if (!drawerOpen || typeof document === "undefined") {
      return null;
    }

    const taskCountLabel = drawerTasks.length
      ? `${drawerTasks.length} ${drawerTasks.length === 1 ? "task" : "tasks"}`
      : "No tasks yet";

    const mapStatusMessage = error
      ? "We couldn’t load task locations."
      : loading
        ? "Loading task locations…"
        : "Add locations to your tasks to see them appear here.";

    return createPortal(
      <div className={styles.sheetOverlay} role="presentation">
        <div className={styles.mapLayer}>
          <div className={styles.mapCanvas}>
            <Map
              location={mapLocation}
              address={mapAddress}
              scrollWheelZoom={true}
              dragging={true}
              touchZoom={true}
              showUserLocation={false}
              markers={mapMarkers}
              onMarkerClick={handleMarkerClick}
              focusLocation={mapFocus}
              focusZoom={15}
            />
          </div>
          <div className={styles.mapGradient} aria-hidden="true" />
          <div className={styles.mapHeader}>
            <span className={styles.mapProject}>{projectName ?? "Project tasks"}</span>
            <span className={styles.mapMeta}>{taskCountLabel}</span>
          </div>
          {!hasMapMarkers ? <div className={styles.mapEmptyBanner}>{mapStatusMessage}</div> : null}
          {selectedTask ? (
            <div className={styles.mapActiveCard}>
              <span className={styles.mapActiveTitle}>{selectedTask.title}</span>
              <div className={styles.mapActiveMeta}>
                <span className={styles.metaLine}>
                  <Calendar size={14} aria-hidden="true" /> {formatDueLabel(selectedTask)}
                </span>
                {selectedTask.address ? (
                  <span className={styles.metaLine}>
                    <MapPin size={14} aria-hidden="true" /> {selectedTask.address}
                  </span>
                ) : null}
                {selectedAssigneeName ? (
                  <span className={styles.metaLine}>
                    <User size={14} aria-hidden="true" /> Assigned to :
                    {" "}
                    {selectedAssigneeName}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.sheetDismiss}
          onClick={handleCloseDrawer}
          aria-label="Close tasks drawer"
        >
          <ChevronDown size={22} strokeWidth={2.5} />
        </button>
        <motion.div
          ref={sheetRef}
          className={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label="Project tasks quick view"
          drag="y"
          dragElastic={{ top: 0.2, bottom: 0.3 }}
          dragConstraints={{ top: 0, bottom: maxDragOffset }}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          initial={{ y: viewportHeight }}
          animate={{ y: targetY }}
          transition={{ type: "spring", stiffness: 360, damping: 42, mass: 0.9 }}
        >
          <div
            className={styles.sheetHandle}
            role="button"
            tabIndex={0}
            aria-label="Toggle tasks drawer size"
            onClick={handleHandleClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleHandleClick();
              }
            }}
          >
            <span className={styles.sheetHandleBar} aria-hidden="true" />
          </div>
          <header className={styles.sheetHeader}>
            <div className={styles.sheetTitleGroup}>
              <span className={styles.sheetTitle}>Project tasks</span>
              <span className={styles.sheetSubtitle}>
                {projectName ? `Everything happening in ${projectName}` : "Keep work on track"}
              </span>
            </div>
          </header>
          <div className={styles.sheetSummary}>
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
          </div>
          <div className={styles.sheetScrollArea}>
            <section className={styles.sheetSection} aria-label="All project tasks">
              <h3 className={styles.sectionHeading}>Task list</h3>
              {error ? (
                <div className={styles.error}>{error}</div>
              ) : loading ? (
                <div className={styles.loading}>Loading tasks…</div>
              ) : drawerTasks.length ? (
                <ul className={styles.taskList} ref={taskListRef}>
                  {drawerTasks.map((task) => {
                    const isActive = task.id === activeTaskId;
                    const assigneeLabel = formatAssigneeDisplay(task.assignedTo);
                    return (
                      <li
                        key={task.id}
                        data-task-id={task.id}
                        className={`${styles.taskItem}${isActive ? ` ${styles.taskItemActive}` : ""}`}
                      >
                        <button
                          type="button"
                          className={styles.taskButton}
                          onClick={() => handleTaskSelect(task.id)}
                        >
                          <div className={styles.taskTitleRow}>
                            <span className={styles.taskTitle}>{task.title}</span>
                            <span className={styles.statusBadge}>
                              {task.status === "done" ? "Completed" : task.status.replace(/_/g, " ")}
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
                            ) : (
                              <span className={`${styles.metaLine} ${styles.metaLineMuted}`}>
                                <MapPin size={14} aria-hidden="true" /> No location
                              </span>
                            )}
                            {assigneeLabel ? (
                              <span className={styles.metaLine}>
                                <User size={14} aria-hidden="true" /> Assigned to :
                                {" "}
                                {assigneeLabel}
                              </span>
                            ) : (
                              <span className={`${styles.metaLine} ${styles.metaLineMuted}`}>
                                <User size={14} aria-hidden="true" /> No assignee
                              </span>
                            )}
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

            <section className={styles.sheetSection} aria-label="Create a quick task">
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
        </motion.div>
      </div>,
      document.body,
    );
  };

  return (
    <section className={styles.card} aria-label="Project tasks overview">
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h3 className={styles.title}>Tasks</h3>
          <p className={styles.subtitle}>
            {projectName
              ? `Keep ${projectName} moving forward.`
              : "Keep this project moving forward."}
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleOpenQuickCreate}
            aria-label="Quick create a task"
            disabled={loading || !hasQuickCreateProject}
          >
            <Plus size={18} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleOpenDrawer}
            disabled={loading}
          >
            Open tasks
          </button>
        </div>
      </header>

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

      {renderDrawer()}
      <QuickCreateTaskModal
        open={quickCreateOpen}
        onClose={handleCloseQuickCreate}
        projects={quickCreateProjects}
        onCreated={refreshTasks}
      />
    </section>
  );
};

export default TasksComponentMobile;
