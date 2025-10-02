import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchTasks } from "@/shared/utils/api";
import QuickCreateTaskModal, {
  type QuickCreateTaskModalProject,
  type QuickCreateTaskModalTask,
} from "@/dashboard/home/components/QuickCreateTaskModal";

import styles from "./TasksComponentMobile.module.css";
import TaskDrawer from "./components/TaskDrawer";
import TaskList from "./components/TaskList";
import TaskSummary from "./components/TaskSummary";
import {
  DEFAULT_LOCATION,
  DRAWER_SNAP_POINTS,
  buildMapMarkers,
  buildMarkerThumbnail,
  computeStats,
  formatDueDate,
  formatDueLabel,
  getViewportHeight,
  isSameDay,
  normalizeTask,
  sortTasksForDrawer,
  type QuickTask,
  type RawTask,
  type TaskMapMarker,
  type TaskStats,
  type SnapIndex,
} from "./components/quickTaskUtils";
import { formatAssigneeDisplay } from "./utils";

export type TasksComponentProps = {
  projectId?: string;
  projectName?: string;
  projectColor?: string;
};

const TasksComponent: React.FC<TasksComponentProps> = ({
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
  const [snapIndex, setSnapIndex] = useState<SnapIndex>(2);
  const [viewportHeight, setViewportHeight] = useState(() => getViewportHeight());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [currentDragY, setCurrentDragY] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const inlineTaskListRef = useRef<HTMLUListElement | null>(null);
  const drawerTaskListRef = useRef<HTMLUListElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const initialScrollDoneRef = useRef(false);

  const quickCreateProjects = useMemo<QuickCreateTaskModalProject[]>(() => {
    if (projectId && projectName) {
      return [{ id: projectId, name: projectName }];
    }

    if (tasks.length > 0) {
      const firstTask = tasks[0];
      if (firstTask.projectId) {
        return [{ id: firstTask.projectId, name: firstTask.projectId }];
      }
    }

    return [];
  }, [projectId, projectName, tasks]);

  const hasQuickCreateProject = quickCreateProjects.length > 0;

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
    if (!tasks.length) {
      setActiveTaskId(null);
      return;
    }

    if (!activeTaskId || !tasks.some((task) => task.id === activeTaskId)) {
      setActiveTaskId(tasks[0].id);
    }
  }, [tasks, activeTaskId]);

  const stats = useMemo<TaskStats>(() => computeStats(tasks), [tasks]);

  const formatStatValue = (value: number): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value;
  };

  const drawerTasks = useMemo(() => sortTasksForDrawer(tasks), [tasks]);

  const mapTasks = useMemo(
    () => tasks.filter((task) => task.location && !Number.isNaN(task.location.lat) && !Number.isNaN(task.location.lng)),
    [tasks],
  );

  const mapLocation = mapTasks[0]?.location ?? DEFAULT_LOCATION;
  const mapAddress = mapTasks[0]?.address ?? projectName ?? "Project";

  const markerThumbnail = useMemo(() => buildMarkerThumbnail(projectColor), [projectColor]);

  const mapMarkers = useMemo<TaskMapMarker[]>(
    () => buildMapMarkers(mapTasks, markerThumbnail, activeTaskId),
    [mapTasks, markerThumbnail, activeTaskId],
  );

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
    if (!drawerOpen || !activeTaskId || !drawerTaskListRef.current) return;
    const container = drawerTaskListRef.current;
    const target = container.querySelector<HTMLLIElement>(`[data-task-id="${activeTaskId}"]`);
    if (!target) return;

    const behavior: ScrollBehavior = initialScrollDoneRef.current ? "smooth" : "auto";
    target.scrollIntoView({ block: "center", behavior });
    initialScrollDoneRef.current = true;
  }, [activeTaskId, drawerOpen]);

  useEffect(() => {
    if (!drawerOpen || typeof document === "undefined") return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setIsDesktop(false);
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateMatch = () => setIsDesktop(mediaQuery.matches);
    updateMatch();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMatch);
      return () => mediaQuery.removeEventListener("change", updateMatch);
    }

    mediaQuery.addListener(updateMatch);
    return () => mediaQuery.removeListener(updateMatch);
  }, []);

  const sheetHeights = useMemo(() => DRAWER_SNAP_POINTS.map((point) => viewportHeight * point), [viewportHeight]);
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
        const match = drawerTasks.find((task) => task.id === taskId) ?? tasks.find((task) => task.id === taskId);
        if (match) {
          setTaskToEdit(toModalTask(match));
          setQuickCreateOpen(true);
        }
      } else {
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

  const handleOpenDrawer = useCallback(() => {
    setDrawerOpen(true);
    setSnapIndex(2);
    initialScrollDoneRef.current = false;
    setViewportHeight(getViewportHeight());
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSnapIndex(2);
    setMapFocus(null);
    initialScrollDoneRef.current = false;
  }, []);

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
      event.preventDefault();
    }
  }, [isDragging, dragStartY]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartY(null);

      const threshold = viewportHeight * 0.15;
      if (Math.abs(currentDragY) > threshold) {
        if (currentDragY > 0) {
          setSnapIndex((current) => Math.max(0, current - 1) as SnapIndex);
        } else {
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

    const sorted = datedTasks.slice().sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const nextDue = sorted[0];
    const sameDayCount = sorted.filter((task) => isSameDay(task.dueDate, nextDue.dueDate)).length;
    const noun = sameDayCount === 1 ? "task" : "tasks";
    return `${sameDayCount} ${noun} due ${formatDueDate(nextDue.dueDate)}.`;
  }, [error, loading, tasks]);

  const mapStatusMessage = useMemo(() => {
    if (error) return "We couldn’t load task locations.";
    if (loading) return "Loading task locations…";
    if (!mapTasks.length) return "Add locations to your tasks to see them appear here.";
    return `${mapTasks.length === 1 ? "One" : mapTasks.length} task${mapTasks.length === 1 ? "" : "s"} showing on the map.`;
  }, [error, loading, mapTasks.length]);

  const listMetaLabel = useMemo(() => {
    if (error) return "Error";
    if (loading) return "Loading…";
    if (!tasks.length) return "No tasks yet";
    const noun = tasks.length === 1 ? "task" : "tasks";
    return `${tasks.length} ${noun}`;
  }, [error, loading, tasks.length]);

  return (
    <section className={`${styles.card} ${styles.desktopCard}`} aria-label="Project tasks overview">
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h3 className={styles.title}>Tasks</h3>
          <p className={styles.subtitle}>
            {projectName ? `Keep ${projectName} moving forward.` : "Keep this project moving forward."}
          </p>
        </div>
        <div className={styles.desktopActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleOpenQuickCreate}
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
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New task
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleOpenDrawer}
            disabled={loading}
          >
            Open map view
          </button>
        </div>
      </header>

      <div className={styles.desktopSummaryRow}>
        <TaskSummary stats={stats} formatValue={formatStatValue} statusMessage={statusMessage} />
        <div className={styles.statusCard}>
          <span className={styles.statusEyebrow}>What to know</span>
          <p className={styles.statusMessage}>{statusMessage}</p>
          <p className={styles.statusSupport}>{mapStatusMessage}</p>
        </div>
      </div>

      <section className={styles.listSection} aria-label="All project tasks">
        <div className={styles.listHeader}>
          <h4 className={styles.sectionHeading}>Task list</h4>
          <span className={styles.listMeta}>{listMetaLabel}</span>
        </div>
        <div className={styles.listSurface}>
          {error ? (
            <div className={styles.error}>{error}</div>
          ) : loading ? (
            <div className={styles.loading}>Loading tasks…</div>
          ) : tasks.length ? (
            <TaskList
              tasks={drawerTasks}
              activeTaskId={activeTaskId}
              onTaskSelect={handleTaskSelect}
              formatDueLabel={formatDueLabel}
              taskListRef={inlineTaskListRef}
            />
          ) : (
            <div className={styles.empty}>No tasks yet. Create one to get started.</div>
          )}
        </div>
      </section>

      <TaskDrawer
        open={drawerOpen}
        isDesktop={isDesktop}
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
        taskListRef={drawerTaskListRef}
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

export default TasksComponent;
