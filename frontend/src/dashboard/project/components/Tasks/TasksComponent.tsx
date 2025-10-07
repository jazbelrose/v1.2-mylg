import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchTasks } from "@/shared/utils/api";
import QuickCreateTaskModal, {
  type QuickCreateTaskModalProject,
  type QuickCreateTaskModalTask,
} from "@/dashboard/home/components/QuickCreateTaskModal";

import TaskDrawer from "./components/TaskDrawer";
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
import { formatAssigneeDisplay, buildDirectionsLinks } from "./utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  User2,
} from "lucide-react";
import {
  createTaskStatusContext,
  getTaskStatusBadge,
  getTaskStatusTone,
  type TaskStatusTone,
} from "./components/quickTaskUtils";

const brand = {
  bg: "bg-[#0c0c0c]",
  surface: "bg-[#111111]",
  surface2: "bg-[#151515]",
  border: "border-[rgba(255,255,255,0.06)]",
  textDim: "text-white/70",
  accent: "#FA3356",
} as const;

type StatChipTone = "ok" | "warn" | "soon";

type StatChipProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: StatChipTone;
};

function StatChip({ icon, label, value, tone }: StatChipProps) {
  const toneGrad =
    tone === "ok"
      ? "from-emerald-500/20 to-emerald-500/0"
      : tone === "warn"
        ? "from-rose-500/20 to-rose-500/0"
        : "from-amber-500/20 to-amber-500/0";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${brand.surface} border ${brand.border} p-3 md:p-4`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneGrad}`} />
      <div className="relative flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/30">
          {icon}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
          <div className="text-lg font-semibold leading-none">{value}</div>
        </div>
      </div>
    </div>
  );
}

const STATUS_BADGE_TONES: Record<TaskStatusTone, string> = {
  success:
    "border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 group-hover:border-emerald-400/50",
  danger:
    "border border-rose-500/40 bg-rose-500/10 text-rose-200 group-hover:border-rose-400/60",
  warning:
    "border border-amber-400/40 bg-amber-500/10 text-amber-100 group-hover:border-amber-300/60",
  neutral:
    "border border-white/15 bg-white/5 text-white/80 group-hover:border-white/25",
};

type InlineTaskItemProps = {
  task: QuickTask;
  isActive: boolean;
  dueLabel: string;
  statusContext: ReturnType<typeof createTaskStatusContext>;
  onSelect: (taskId: string) => void;
  onEdit: (task: QuickTask) => void;
  canEdit: boolean;
};

const InlineTaskItem: React.FC<InlineTaskItemProps> = ({
  task,
  isActive,
  dueLabel,
  statusContext,
  onSelect,
  onEdit,
  canEdit,
}) => {
  const assigneeLabel = formatAssigneeDisplay(task.assignedTo);
  const { category, label } = getTaskStatusBadge(task.status, task.dueDate, statusContext);
  const tone = getTaskStatusTone(category);
  const badgeTone = STATUS_BADGE_TONES[tone];
  const directionsLinks = buildDirectionsLinks(task.address);

  return (
    <li
      key={task.id}
      data-task-id={task.id}
      className={`group rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm transition-colors hover:border-white/20 ${
        isActive ? "border-white/40" : ""
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        className="flex flex-col gap-4 p-4 md:p-5 focus:outline-none"
        onClick={() => onSelect(task.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(task.id);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-base font-medium md:text-lg">{task.title}</h4>
              <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${badgeTone}`}>{label}</Badge>
            </div>
            <div className={`mt-1 flex flex-wrap items-center gap-3 text-sm ${brand.textDim}`}>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {dueLabel}
              </span>
              {task.address ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate">{task.address}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  No location
                </span>
              )}
              {assigneeLabel ? (
                <span className="inline-flex items-center gap-1">
                  <User2 className="h-4 w-4" aria-hidden="true" />
                  Assigned to: {assigneeLabel}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <User2 className="h-4 w-4" aria-hidden="true" />
                  No assignee
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {directionsLinks ? (
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <a
                href={directionsLinks.googleMaps}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Open in Maps <ArrowUpRight className="ml-1 inline h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button
            size="sm"
            className="rounded-xl text-white"
            style={{ background: brand.accent }}
            disabled={!canEdit}
            onClick={(event) => {
              event.stopPropagation();
              if (canEdit) {
                onEdit(task);
              }
            }}
          >
            Mark done
          </Button>
        </div>
      </div>
    </li>
  );
};

type InlineTaskListProps = {
  tasks: QuickTask[];
  activeTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
  onTaskEdit: (task: QuickTask) => void;
  formatDueLabel: (task: QuickTask) => string;
  taskListRef: React.RefObject<HTMLUListElement>;
  canEdit: boolean;
};

const InlineTaskList: React.FC<InlineTaskListProps> = ({
  tasks,
  activeTaskId,
  onTaskSelect,
  onTaskEdit,
  formatDueLabel,
  taskListRef,
  canEdit,
}) => {
  const statusContext = useMemo(() => createTaskStatusContext(), []);

  return (
    <ul ref={taskListRef} className="space-y-3">
      {tasks.map((task) => (
        <InlineTaskItem
          key={task.id}
          task={task}
          isActive={task.id === activeTaskId}
          dueLabel={formatDueLabel(task)}
          statusContext={statusContext}
          onSelect={onTaskSelect}
          onEdit={onTaskEdit}
          canEdit={canEdit}
        />
      ))}
    </ul>
  );
};

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

  const handleInlineEdit = useCallback(
    (task: QuickTask) => {
      setTaskToEdit(toModalTask(task));
      setQuickCreateOpen(true);
    },
    [toModalTask],
  );

  const toStatString = (value: number) => {
    const formatted = formatStatValue(value);
    return typeof formatted === "number" ? formatted.toString() : formatted;
  };

  return (
    <section className="tasks-component" aria-label="Project tasks overview">
      <div
        className={`flex w-full flex-col gap-6 rounded-3xl border ${brand.border} ${brand.surface} p-4 text-white shadow-[0_20px_40px_rgba(0,0,0,0.45)] md:p-6 lg:p-8`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold md:text-2xl">Tasks</h3>
            <p className={`${brand.textDim} text-sm`}>
              {projectName ? `Keep ${projectName} moving forward.` : "Keep this project moving forward."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              className="rounded-xl"
              style={{ background: brand.accent }}
              onClick={handleOpenQuickCreate}
              disabled={loading || !hasQuickCreateProject}
            >
              <Plus className="mr-1 h-4 w-4" /> New task
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/20 text-white hover:bg-white/10"
              onClick={handleOpenDrawer}
              disabled={loading}
            >
              Open map view
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <StatChip icon={<CheckCircle2 className="h-5 w-5" />} label="Done" value={toStatString(stats.completed)} tone="ok" />
          <StatChip icon={<AlertTriangle className="h-5 w-5" />} label="Overdue" value={toStatString(stats.overdue)} tone="warn" />
          <StatChip icon={<Clock className="h-5 w-5" />} label="Due soon" value={toStatString(stats.dueSoon)} tone="soon" />
        </div>

        <div className={`rounded-2xl border ${brand.border} ${brand.surface2} p-4 md:p-5`}>
          <div className="text-sm">
            <span className="font-medium">What to know:</span> {statusMessage}{" "}
            <span className={brand.textDim}>{mapStatusMessage}</span>
          </div>
        </div>

        <section aria-label="All project tasks" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold">Task list</h4>
            <span className={`${brand.textDim} text-sm`}>{listMetaLabel}</span>
          </div>
          {error ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
              Loading tasks…
            </div>
          ) : tasks.length ? (
            <InlineTaskList
              tasks={drawerTasks}
              activeTaskId={activeTaskId}
              onTaskSelect={handleTaskSelect}
              onTaskEdit={handleInlineEdit}
              formatDueLabel={formatDueLabel}
              taskListRef={inlineTaskListRef}
              canEdit={hasQuickCreateProject}
            />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-white/70">
              No tasks yet. Create one to get started.
            </div>
          )}
        </section>

        <Separator className="bg-white/10" />
        <p className={`${brand.textDim} text-xs`}>
          Tip: keep everything on a single surface. Use flat cards for items; avoid wrapping the list in another heavy panel.
        </p>
      </div>

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
