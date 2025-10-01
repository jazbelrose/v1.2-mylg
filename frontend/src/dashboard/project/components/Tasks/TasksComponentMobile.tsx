import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchTasks } from "@/shared/utils/api";
import QuickCreateTaskModal, {
  type QuickCreateTaskModalProject,
  type QuickCreateTaskModalTask,
} from "@/dashboard/home/components/QuickCreateTaskModal";
import type { Project } from "@/app/contexts/DataProvider";

import styles from "./TasksComponentMobile.module.css";
import type { Status } from "./types";
import TaskDrawer from "./components/TaskDrawer";
import TaskSummary from "./components/TaskSummary";
import {
  type QuickTask,
  type RawTask,
  type TaskMapMarker,
  type TaskStats,
} from "./components/taskTypes";
import { formatAssigneeDisplay, parseDueDate, parseLocation } from "./utils";

type TasksComponentMobileProps = {
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  activeProject?: Project;
  onActiveProjectChange?: (updatedProject: Project) => void;
};

const dueFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  weekday: "short",
});

const DEFAULT_LOCATION = { lat: 37.0902, lng: -95.7129 }; // Geographic centre of contiguous US
const SNAP_POINTS = [0.1, 0.45, 0.9] as const;
type SnapIndex = 0 | 1 | 2;

function getViewportHeight(): number {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

function toDateInputString(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
          value.getDate(),
        ).padStart(2, "0")}`;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(
        parsed.getDate(),
      ).padStart(2, "0")}`;
    }
  }

  return null;
}

function normalizeTask(raw: RawTask): QuickTask | null {
  const id = raw.taskId || raw.id;
  const title = (raw.title || raw.name || "").toString().trim();
  if (!id) return null;

  const dueSource = raw.dueAt ?? raw.due_at ?? raw.dueDate ?? raw.due_date ?? raw.due;
  const dueDate = parseDueDate(dueSource);

  return {
    id,
    title: title || "Untitled task",
    description: typeof raw.description === "string" ? raw.description : undefined,
    status: (raw.status as Status) || "todo",
    dueDate,
    dueDateInput: toDateInputString(dueSource),
    address: typeof raw.address === "string" ? raw.address : undefined,
    location: parseLocation(raw.location),
    assignedTo:
      typeof raw.assigneeId === "string"
        ? raw.assigneeId
        : typeof raw.assignedTo === "string"
          ? raw.assignedTo
          : undefined,
    projectId: typeof raw.projectId === "string" ? raw.projectId : undefined,
    raw,
  };
}

function formatDueLabel(task: QuickTask): string {
  if (!task.dueDate) return "No due date";
  return dueFormatter.format(task.dueDate);
}

function computeStats(tasks: QuickTask[]): TaskStats {
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
  const fill = color && color.trim() ? color : "#2563eb";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg"><path d="M20 2C11.163 2 4 9.163 4 18c0 11.046 16 30 16 30s16-18.954 16-30C36 9.163 28.837 2 20 2z" fill="${fill}" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="18" r="7" fill="#ffffff"/></svg>`;
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
  const [taskToEdit, setTaskToEdit] = useState<QuickCreateTaskModalTask | null>(null);
  const [snapIndex, setSnapIndex] = useState<SnapIndex>(1);
  const [viewportHeight, setViewportHeight] = useState(() => getViewportHeight());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [currentDragY, setCurrentDragY] = useState(0);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const taskListRef = useRef<HTMLUListElement | null>(null);
  const initialScrollDoneRef = useRef(false);

  const quickCreateProjects = useMemo<QuickCreateTaskModalProject[]>(() => {
    // Always provide at least the current project for editing tasks
    if (projectId && projectName) {
      return [{ id: projectId, name: projectName }];
    }
    
    // If no project info available, try to extract from tasks
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      if (firstTask.projectId) {
        return [{ id: firstTask.projectId, name: firstTask.projectId }];
      }
    }
    
    // Fallback to allow editing without project constraint
    return [];
  }, [projectId, projectName, tasks]);
  const hasQuickCreateProject = quickCreateProjects.length > 0;

  const handleOpenDrawer = useCallback(() => {
    setDrawerOpen(true);
    // Start the sheet in the mid snap-point so tasks are visible immediately.
    setSnapIndex(1);
    initialScrollDoneRef.current = false;
    setViewportHeight(getViewportHeight());
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSnapIndex(1);
    setActiveTaskId(null);
    setMapFocus(null);
    initialScrollDoneRef.current = false;
  }, []);

  const handleOpenQuickCreate = useCallback(() => {
    if (!hasQuickCreateProject) return;
    setTaskToEdit(null);
    setQuickCreateOpen(true);
  }, [hasQuickCreateProject]);

  const handleCloseQuickCreate = useCallback(() => {
    setTaskToEdit(null);
    setQuickCreateOpen(false);
  }, []);

  const toModalTask = useCallback(
    (task: QuickTask): QuickCreateTaskModalTask => {
      const resolvedProjectId = task.projectId || projectId || "";
      return {
        id: task.id,
        taskId: task.id,
        projectId: resolvedProjectId,
        projectName,
        title: task.title,
        description: task.description ?? undefined,
        dueDate: task.dueDateInput ?? (task.dueDate ? task.dueDate.toISOString() : null),
        status: task.status,
        assigneeId: task.assignedTo ?? undefined,
        address: task.address ?? undefined,
        location: (task.location ?? task.raw?.location) as QuickCreateTaskModalTask["location"],
      };
    },
    [projectId, projectName],
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

  const mapMarkers = useMemo<TaskMapMarker[]>(
    () =>
      mapTasks.map((task) => ({
        id: task.id,
        lat: task.location!.lat,
        lng: task.location!.lng,
        iconUrl: markerThumbnail,
        title: task.title,
        isActive: task.id === activeTaskId,
        variant: "pin",
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
  const baseTargetY = viewportHeight ? viewportHeight - sheetHeights[snapIndex] : 0;
  const targetY = isDragging ? baseTargetY + currentDragY : baseTargetY;
  const selectedTask = useMemo(
    () => drawerTasks.find((task) => task.id === activeTaskId) ?? null,
    [drawerTasks, activeTaskId],
  );
  const selectedAssigneeName = formatAssigneeDisplay(selectedTask?.assignedTo);

  const handleTaskSelect = useCallback(
    (taskId: string) => {
      if (activeTaskId === taskId) {
        // Second tap on already selected task - open edit modal
        const match = drawerTasks.find((task) => task.id === taskId) ?? tasks.find((task) => task.id === taskId);
        if (match) {
          setTaskToEdit(toModalTask(match));
          setQuickCreateOpen(true);
        }
      } else {
        // First tap - select task and show on map
        setActiveTaskId(taskId);
        setSnapIndex((current) => (current === 0 ? 1 : current));
      }
    },
    [activeTaskId, drawerTasks, tasks, toModalTask],
  );

  const handleMarkerClick = useCallback(
    (markerId: string) => {
      handleTaskSelect(markerId);
    },
    [handleTaskSelect],
  );

  const handleHandleClick = useCallback(() => {
    setSnapIndex((current) => {
      if (current === 2) return 1;
      if (current === 1) return 2;
      return 1;
    });
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      setIsDragging(true);
      setDragStartY(event.touches[0].clientY);
      setCurrentDragY(0);
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (isDragging && dragStartY !== null && event.touches.length === 1) {
      const deltaY = event.touches[0].clientY - dragStartY;
      setCurrentDragY(deltaY);
      // Prevent scrolling while dragging
      event.preventDefault();
    }
  }, [isDragging, dragStartY]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartY(null);
      
      // Snap to nearest position based on drag distance
      const threshold = viewportHeight * 0.15; // 15% of viewport
      if (Math.abs(currentDragY) > threshold) {
        if (currentDragY > 0) {
          // Dragged down - go to lower snap point
          setSnapIndex((current) => Math.max(0, current - 1) as SnapIndex);
        } else {
          // Dragged up - go to higher snap point
          setSnapIndex((current) => Math.min(2, current + 1) as SnapIndex);
        }
      }
      
      setCurrentDragY(0);
    }
  }, [isDragging, currentDragY, viewportHeight]);

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

  const mapStatusMessage = useMemo(() => {
    if (error) return "We couldn’t load task locations.";
    if (loading) return "Loading task locations…";
    return "Add locations to your tasks to see them appear here.";
  }, [error, loading]);

  return (
    <section className={`${styles.card} tasks-component`} aria-label="Project tasks overview">
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
            className={styles.primaryButton}
            onClick={handleOpenDrawer}
            disabled={loading}
          >
            Open tasks
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleOpenQuickCreate}
            aria-label="Quick create a task"
            disabled={loading || !hasQuickCreateProject}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block', flexShrink: 0 }}
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </header>

      <TaskSummary
        stats={stats}
        formatValue={formatStatValue}
        statusMessage={statusMessage}
        statRowClassName={styles.cardStatRow}
        statusClassName={styles.cardStatus}
      />

      <TaskDrawer
        open={drawerOpen}
        viewportHeight={viewportHeight}
        targetY={targetY}
        projectName={projectName}
        mapLocation={mapLocation}
        mapAddress={mapAddress}
        mapMarkers={mapMarkers}
        mapFocus={mapFocus}
        mapStatusMessage={mapStatusMessage}
        hasQuickCreateProject={hasQuickCreateProject}
        loading={loading}
        error={error}
        stats={stats}
        formatValue={formatStatValue}
        statusMessage={statusMessage}
        tasks={drawerTasks}
        activeTaskId={activeTaskId}
        onTaskSelect={handleTaskSelect}
        formatDueLabel={formatDueLabel}
        selectedTask={selectedTask}
        selectedAssigneeName={selectedAssigneeName}
        onMarkerClick={handleMarkerClick}
        onClose={handleCloseDrawer}
        onOpenQuickCreate={handleOpenQuickCreate}
        onHandleClick={handleHandleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sheetRef={sheetRef}
        taskListRef={taskListRef}
      />
      <QuickCreateTaskModal
        open={quickCreateOpen}
        onClose={handleCloseQuickCreate}
        projects={quickCreateProjects}
        onCreated={refreshTasks}
        onUpdated={refreshTasks}
        onDeleted={refreshTasks}
        task={taskToEdit}
        activeProjectId={projectId}
        activeProjectName={projectName}
        scopedProjectId={projectId ?? null}
      />
    </section>
  );
};

export default TasksComponentMobile;


