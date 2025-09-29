import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, MapPin, Calendar, ChevronDown } from "lucide-react";
import { motion, useDragControls, useMotionValue, animate, type PanInfo } from "framer-motion";

import Map from "@/shared/ui/Map";
import { createTask, fetchTasks } from "@/shared/utils/api";

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
};

const dueFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  weekday: "short",
});

const DEFAULT_LOCATION = { lat: 37.0902, lng: -95.7129 }; // Geographic centre of contiguous US

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

function buildMarkerThumbnail(
  color?: string,
  options: { active?: boolean } = {},
): { url: string; size: number } | undefined {
  if (!color) return undefined;
  const size = options.active ? 40 : 32;
  const radius = size / 2 - (options.active ? 6 : 4);
  const highlightRing = options.active
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${radius + 4}" fill="rgba(255,255,255,0.16)" />`
    : "";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${highlightRing}<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${color}" stroke="white" stroke-width="${options.active ? 6 : 4}"/></svg>`;
  return { url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, size };
}

const SNAP_POINTS = [0.2, 0.5, 1] as const;

const TasksComponentMobile: React.FC<TasksComponentMobileProps> = ({
  projectId = "",
  projectName,
  projectColor,
}) => {
  const [tasks, setTasks] = useState<QuickTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [sheetSnapIndex, setSheetSnapIndex] = useState<0 | 1 | 2>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerHeight,
  );
  const sheetY = useMotionValue(viewportHeight || 0);
  const dragControls = useDragControls();
  const taskRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const closingRef = useRef(false);

  const computeSnapOffset = useCallback(
    (index: 0 | 1 | 2) => {
      if (!viewportHeight) return 0;
      const fraction = SNAP_POINTS[index];
      return Math.max(viewportHeight * (1 - fraction), 0);
    },
    [viewportHeight],
  );

  const animateToSnap = useCallback(
    (index: 0 | 1 | 2) => {
      if (!viewportHeight) return;
      const target = computeSnapOffset(index);
      void animate(sheetY, target, {
        type: "spring",
        stiffness: 280,
        damping: 32,
        mass: 0.9,
      });
    },
    [computeSnapOffset, sheetY, viewportHeight],
  );

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
    if (!isSheetVisible) {
      sheetY.set(viewportHeight || 0);
    }
  }, [isSheetVisible, sheetY, viewportHeight]);

  useEffect(() => {
    if (typeof window === "undefined" || !isSheetVisible) return;
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [isSheetVisible]);

  useEffect(() => {
    if (!isSheetVisible || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isSheetVisible]);

  useEffect(() => {
    if (!isSheetVisible || !drawerOpen || !viewportHeight) return;
    closingRef.current = false;
    sheetY.set(viewportHeight + 80);
  }, [drawerOpen, isSheetVisible, sheetY, viewportHeight]);

  useEffect(() => {
    if (!isSheetVisible || closingRef.current || !viewportHeight) return;
    animateToSnap(sheetSnapIndex);
  }, [animateToSnap, isSheetVisible, sheetSnapIndex, viewportHeight]);

  useEffect(() => {
    if (!selectedTaskId || !isSheetVisible) return;
    const target = taskRefs.current[selectedTaskId];
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isSheetVisible, selectedTaskId]);

  useEffect(() => {
    const ids = new Set(tasks.map((task) => task.id));
    Object.keys(taskRefs.current).forEach((key) => {
      if (!ids.has(key)) {
        delete taskRefs.current[key];
      }
    });
    if (selectedTaskId && !ids.has(selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, tasks]);

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

  const focusedTask = useMemo(
    () => mapTasks.find((task) => task.id === selectedTaskId) ?? mapTasks[0] ?? null,
    [mapTasks, selectedTaskId],
  );

  const mapLocation = focusedTask?.location ?? DEFAULT_LOCATION;
  const mapAddress = focusedTask?.address ?? projectName ?? "Project";

  const mapMarkers = useMemo(
    () =>
      mapTasks.map((task) => {
        const markerVisual = buildMarkerThumbnail(projectColor, { active: task.id === selectedTaskId });
        return {
          id: task.id,
          lat: task.location!.lat,
          lng: task.location!.lng,
          thumbnail: markerVisual?.url,
          size: markerVisual?.size,
        };
      }),
    [mapTasks, projectColor, selectedTaskId],
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

  const handleOpenDrawer = useCallback(() => {
    setSheetSnapIndex(1);
    setSheetVisible(true);
    setDrawerOpen(true);
    setFormError(null);
    setSuccessMessage(null);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setFormError(null);
    setSuccessMessage(null);
    setSelectedTaskId(null);

    if (!isSheetVisible || closingRef.current) {
      setDrawerOpen(false);
      setSheetVisible(false);
      return;
    }

    setDrawerOpen(false);
    closingRef.current = true;

    if (!viewportHeight) {
      closingRef.current = false;
      setSheetVisible(false);
      sheetY.set(0);
      return;
    }

    const animation = animate(sheetY, viewportHeight + 80, {
      duration: 0.25,
      ease: [0.22, 0.61, 0.36, 1],
    });

    animation.then(
      () => {
        closingRef.current = false;
        setSheetVisible(false);
        sheetY.set(viewportHeight);
      },
      () => {
        closingRef.current = false;
        setSheetVisible(false);
        sheetY.set(viewportHeight);
      },
    );
  }, [isSheetVisible, sheetY, viewportHeight]);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, handleCloseDrawer]);

  const handleMarkerSelect = useCallback(
    (taskId: string) => {
      if (closingRef.current) return;
      setSelectedTaskId(taskId);
      setFormError(null);
      setSuccessMessage(null);

      if (!isSheetVisible) {
        setSheetSnapIndex(2);
        setSheetVisible(true);
        setDrawerOpen(true);
        return;
      }

      if (sheetSnapIndex !== 2) {
        setSheetSnapIndex(2);
      } else {
        animateToSnap(2);
      }
    },
    [animateToSnap, isSheetVisible, sheetSnapIndex],
  );

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
  };

  const handleTaskSelect = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setFormError(null);
    setSuccessMessage(null);
  }, []);

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
    if (!isSheetVisible || typeof document === "undefined") {
      return null;
    }

    const startDrag = (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      dragControls.start(event);
    };

    const handleSheetDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, __: PanInfo) => {
      if (closingRef.current) return;
      const currentOffset = sheetY.get();
      const collapsedOffset = computeSnapOffset(0);
      const hideThreshold = Math.max(viewportHeight * 0.2, 120);

      if (currentOffset > collapsedOffset + hideThreshold) {
        handleCloseDrawer();
        return;
      }

      const nearest = SNAP_POINTS.reduce<{ index: 0 | 1 | 2; distance: number }>(
        (acc, _, index) => {
          const idx = index as 0 | 1 | 2;
          const target = computeSnapOffset(idx);
          const distance = Math.abs(currentOffset - target);
          if (distance < acc.distance) {
            return { index: idx, distance };
          }
          return acc;
        },
        { index: sheetSnapIndex, distance: Number.POSITIVE_INFINITY },
      );

      if (nearest.index !== sheetSnapIndex) {
        setSheetSnapIndex(nearest.index);
      } else {
        animateToSnap(nearest.index);
      }
    };

    const mapStatus = error
      ? { message: error, variant: "error" as const }
      : loading
        ? { message: "Loading tasks…", variant: "muted" as const }
        : mapMarkers.length
          ? null
          : { message: "Add locations to your tasks to see them appear on the map.", variant: "muted" as const };

    return createPortal(
      <div className={styles.sheetOverlay} role="dialog" aria-modal="true" aria-label="Project tasks map view">
        <div className={styles.mapCanvas}>
          <Map
            location={mapLocation}
            address={mapAddress}
            scrollWheelZoom={false}
            dragging={true}
            touchZoom={true}
            showUserLocation={false}
            otherUsers={mapMarkers}
            onOtherMarkerClick={handleMarkerSelect}
          />
          {mapStatus ? (
            <div
              className={`${styles.mapMessage} ${
                mapStatus.variant === "error" ? styles.mapMessageError : styles.mapMessageMuted
              }`}
            >
              {mapStatus.message}
            </div>
          ) : null}
        </div>

        <motion.div
          className={styles.sheet}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={{ top: 0.08, bottom: 0.35 }}
          dragConstraints={{ top: 0, bottom: Math.max(viewportHeight + 80, 160) }}
          onDragEnd={handleSheetDragEnd}
          style={{ y: sheetY }}
        >
          <div className={styles.sheetHandle} onPointerDown={startDrag} role="presentation" />
          <div
            className={styles.sheetHeader}
            onPointerDown={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest("button")) return;
              startDrag(event);
            }}
          >
            <div className={styles.sheetTitleGroup}>
              <span className={styles.sheetTitle}>Project tasks</span>
              <span className={styles.sheetSubtitle}>
                {focusedTask
                  ? `${focusedTask.title}${focusedTask.address ? ` • ${focusedTask.address}` : ""}`
                  : projectName
                    ? `Everything happening in ${projectName}`
                    : "Keep work on track"}
              </span>
            </div>
            <button type="button" className={styles.closeButton} onClick={handleCloseDrawer} aria-label="Close tasks view">
              <ChevronDown size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className={styles.sheetScrollArea}>
            <section className={styles.sheetSection} aria-label="All project tasks">
              <div className={styles.sectionHeadingRow}>
                <h3 className={styles.sectionHeading}>Task list</h3>
                <span className={styles.sectionHint}>{statusMessage}</span>
              </div>
              {error ? (
                <div className={styles.error}>{error}</div>
              ) : loading ? (
                <div className={styles.loading}>Loading tasks…</div>
              ) : drawerTasks.length ? (
                <ul className={styles.drawerTaskList}>
                  {drawerTasks.map((task) => {
                    const isActive = selectedTaskId === task.id;
                    return (
                      <li
                        key={task.id}
                        ref={(node) => {
                          taskRefs.current[task.id] = node;
                        }}
                        className={`${styles.drawerTaskItem} ${isActive ? styles.drawerTaskItemActive : ""}`}
                      >
                        <button
                          type="button"
                          className={styles.taskItemButton}
                          onClick={() => handleTaskSelect(task.id)}
                        >
                          <div className={styles.drawerTaskTop}>
                            <span className={styles.drawerTaskTitle}>{task.title}</span>
                            <span className={styles.statusBadge}>
                              {task.status === "done" ? "Completed" : task.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className={styles.drawerTaskMeta}>
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
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleOpenDrawer}
          disabled={loading}
        >
          <Plus size={16} strokeWidth={2.25} />
          Open tasks
        </button>
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
    </section>
  );
};

export default TasksComponentMobile;
