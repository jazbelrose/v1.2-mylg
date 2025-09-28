import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Play, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { useTasksOverview, type TasksOverviewListItem } from "../hooks/useTasksOverview";
import { endOfWeek } from "@/dashboard/home/utils/dateUtils";
import styles from "./TasksListPage.module.css";

const dayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});

const dueFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  weekday: "short",
});

function formatDueDate(date: Date | null | undefined, timeLabel?: string): string {
  if (!date) return "No due date";
  const formatted = dueFormatter.format(date);
  return timeLabel ? `${formatted} · ${timeLabel}` : formatted;
}

type TaskListProps = {
  tasks: TasksOverviewListItem[];
  emptyLabel: string;
  onStart?: (task: TasksOverviewListItem) => void;
  showCompleted?: boolean;
};

const TaskList: React.FC<TaskListProps> = ({ tasks, emptyLabel, onStart, showCompleted }) => {
  if (!tasks.length) {
    return <div className={styles.sectionEmpty}>{emptyLabel}</div>;
  }

  return (
    <ul className={styles.taskList}>
      {tasks.map((task) => (
        <li key={task.id} className={styles.taskItem}>
          <div className={styles.taskMain}>
            <span
              className={styles.projectDot}
              style={{ backgroundColor: task.projectColor || "var(--brand, #fa3356)" }}
              aria-hidden="true"
            />
            <div className={styles.taskMeta}>
              <span className={styles.taskTitle} title={task.title}>
                {task.title}
              </span>
              <span className={styles.taskDetails}>
                {task.projectName}
                {task.projectName && (task.dueDate || task.timeLabel) ? " · " : ""}
                {formatDueDate(task.dueDate, task.timeLabel)}
              </span>
            </div>
          </div>
          <div className={styles.taskActions}>
            {showCompleted ? (
              <span className={styles.completedTag}>Completed</span>
            ) : onStart ? (
              <button type="button" className={styles.startButton} onClick={() => onStart(task)}>
                Open project
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
};

const TasksListPage: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as { from?: string } | undefined) ?? undefined;
  const returnTo = locationState?.from;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof document === "undefined") return;
    const { style } = document.body;
    const originalOverflow = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = originalOverflow;
    };
  }, [mounted]);

  const handleClose = useCallback(() => {
    if (returnTo) {
      navigate(returnTo, { replace: true });
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard");
    }
  }, [navigate, returnTo]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const onOverlayMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const {
    loading,
    error,
    stats,
    openTasks,
    undatedTasks,
    completedThisWeek,
    navigateToProject,
    handleNavigateToPrimary,
    canNavigateToProject,
    primaryProjectName,
  } = useTasksOverview();

  const { overdueTasks, dueSoonTasks, upcomingTasks } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = endOfWeek(now);

    const overdue: TasksOverviewListItem[] = [];
    const dueSoon: TasksOverviewListItem[] = [];
    const upcoming: TasksOverviewListItem[] = [];

    openTasks.forEach((task) => {
      const due = task.dueDate;
      if (!due) return;

      if (due < todayStart) {
        overdue.push(task);
      } else if (due <= weekEnd) {
        dueSoon.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return { overdueTasks: overdue, dueSoonTasks: dueSoon, upcomingTasks: upcoming };
  }, [openTasks]);

  const dueSoonGroups = useMemo(() => {
    const map = new Map<string, { label: string; tasks: TasksOverviewListItem[] }>();

    dueSoonTasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = `${task.dueDate.getFullYear()}-${task.dueDate.getMonth()}-${task.dueDate.getDate()}`;
      const label = dayLabelFormatter.format(task.dueDate);
      const entry = map.get(key) ?? { label, tasks: [] };
      entry.tasks.push(task);
      map.set(key, entry);
    });

    return Array.from(map.values());
  }, [dueSoonTasks]);

  const hasAnyTask =
    overdueTasks.length > 0 ||
    dueSoonTasks.length > 0 ||
    upcomingTasks.length > 0 ||
    undatedTasks.length > 0 ||
    completedThisWeek.length > 0;

  const introMessage = primaryProjectName
    ? `Review everything on your radar and jump straight back into ${primaryProjectName}.`
    : "Review every task across your projects and start where you left off.";

  const titleId = "tasks-drawer-title";

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className={styles.drawerOverlay} role="presentation" onMouseDown={onOverlayMouseDown}>
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close tasks"
          >
            <ChevronDown size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className={styles.drawerContent}>
          <div className={styles.container}>
            <header className={styles.header}>
              <div className={styles.headingGroup}>
                <h1 id={titleId} className={styles.title}>
                  All tasks
                </h1>
                <p className={styles.subtitle}>{introMessage}</p>
              </div>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={handleNavigateToPrimary}
                disabled={!canNavigateToProject}
              >
                <Play size={18} strokeWidth={2.5} />
                Start next task
              </button>
            </header>

            <section className={styles.statsGrid} aria-label="Task summary">
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Completed this week</span>
                <span className={styles.statValue}>{stats.completed}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Due soon</span>
                <span className={styles.statValue}>{stats.dueSoon}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Overdue</span>
                <span className={styles.statValue}>{stats.overdue}</span>
              </div>
            </section>

            {error ? (
              <div className={styles.emptyState}>We couldn't load tasks right now. Please try again later.</div>
            ) : loading ? (
              <div className={styles.emptyState}>Loading your tasks…</div>
            ) : !hasAnyTask ? (
              <div className={styles.emptyState}>
                You don't have any active tasks. Add a task from a project to see it appear here.
              </div>
            ) : (
              <div className={styles.sections}>
                <section className={`${styles.section} ${styles.sectionOverdue}`} aria-labelledby="tasks-overdue-heading">
                  <span className={styles.sectionAccent} aria-hidden="true" />
                  <div className={styles.sectionTitleRow}>
                    <h2 id="tasks-overdue-heading" className={styles.sectionTitle}>
                      Overdue
                    </h2>
                    <p className={styles.sectionCaption}>Tasks that slipped past their due date.</p>
                  </div>
                  <TaskList
                    tasks={overdueTasks}
                    emptyLabel="No overdue tasks. Nice work keeping things on track!"
                    onStart={(task) => navigateToProject(task.projectId)}
                  />
                </section>

                <section className={`${styles.section} ${styles.sectionDueSoon}`} aria-labelledby="tasks-due-soon-heading">
                  <span className={styles.sectionAccent} aria-hidden="true" />
                  <div className={styles.sectionTitleRow}>
                    <h2 id="tasks-due-soon-heading" className={styles.sectionTitle}>
                      Due this week
                    </h2>
                    <p className={styles.sectionCaption}>Everything scheduled between now and the end of the week.</p>
                  </div>
                  {dueSoonGroups.length ? (
                    dueSoonGroups.map((group) => (
                      <div key={group.label} className={styles.group}>
                        <h3 className={styles.groupTitle}>{group.label}</h3>
                        <TaskList
                          tasks={group.tasks}
                          emptyLabel="All set for this day."
                          onStart={(task) => navigateToProject(task.projectId)}
                        />
                      </div>
                    ))
                  ) : (
                    <div className={styles.sectionEmpty}>No tasks due for the rest of this week.</div>
                  )}
                </section>

                <section className={`${styles.section} ${styles.sectionUpcoming}`} aria-labelledby="tasks-upcoming-heading">
                  <span className={styles.sectionAccent} aria-hidden="true" />
                  <div className={styles.sectionTitleRow}>
                    <h2 id="tasks-upcoming-heading" className={styles.sectionTitle}>
                      Coming up
                    </h2>
                    <p className={styles.sectionCaption}>Preview what's planned beyond this week.</p>
                  </div>
                  <TaskList
                    tasks={upcomingTasks}
                    emptyLabel="No future tasks yet. When you plan ahead they'll show up here."
                    onStart={(task) => navigateToProject(task.projectId)}
                  />
                </section>

                <section className={`${styles.section} ${styles.sectionUndated}`} aria-labelledby="tasks-undated-heading">
                  <span className={styles.sectionAccent} aria-hidden="true" />
                  <div className={styles.sectionTitleRow}>
                    <h2 id="tasks-undated-heading" className={styles.sectionTitle}>
                      No due date
                    </h2>
                    <p className={styles.sectionCaption}>Ideas or tasks to tackle when you're ready.</p>
                  </div>
                  <TaskList
                    tasks={undatedTasks}
                    emptyLabel="Nothing in your backlog without a due date."
                    onStart={(task) => navigateToProject(task.projectId)}
                  />
                </section>

                <section className={`${styles.section} ${styles.sectionCompleted}`} aria-labelledby="tasks-completed-heading">
                  <span className={styles.sectionAccent} aria-hidden="true" />
                  <div className={styles.sectionTitleRow}>
                    <h2 id="tasks-completed-heading" className={styles.sectionTitle}>
                      Completed this week
                    </h2>
                    <p className={styles.sectionCaption}>Recently wrapped up items within the current week.</p>
                  </div>
                  <TaskList
                    tasks={completedThisWeek}
                    emptyLabel="No completed tasks this week yet."
                    showCompleted
                  />
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TasksListPage;
