import React from "react";
import { CheckCircle2, Play } from "lucide-react";

import {
  useTasksOverview,
  type ProjectTasksOverview,
  type ProjectTask,
} from "@/dashboard/home/hooks/useTasksOverview";

import styles from "./TasksPage.module.css";

function formatStatus(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "in_progress") return "In progress";
  if (normalized === "todo") return "To do";
  if (normalized === "done") return "Done";
  return normalized
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const TasksPage: React.FC = () => {
  const { loading, error, stats, tasksByProject, handleNavigateToProject } = useTasksOverview();

  const formatStatValue = React.useCallback(
    (value: number): string | number => {
      if (error) return "—";
      if (loading) return "…";
      return value;
    },
    [error, loading],
  );

  const renderTask = (task: ProjectTask) => {
    return (
      <li key={task.id} className={styles.taskItem}>
        <div className={styles.taskText}>
          <p className={styles.taskTitle}>{task.title}</p>
          {(task.dueLabel || task.timeLabel) && (
            <span className={styles.taskMeta}>
              {task.dueLabel}
              {task.dueLabel && task.timeLabel ? " · " : ""}
              {task.timeLabel}
            </span>
          )}
        </div>
        <span className={styles.taskStatus}>{formatStatus(task.status)}</span>
      </li>
    );
  };

  const renderProject = (project: ProjectTasksOverview) => {
    const openCount = project.openTasks.length;
    const completedCount = project.completedTasks.length;
    const openLabel = openCount === 1 ? "task" : "tasks";

    return (
      <section key={project.projectId} className={styles.projectCard}>
        <header className={styles.projectHeader}>
          <div className={styles.projectInfo}>
            <span
              className={styles.projectDot}
              style={{ backgroundColor: project.projectColor || "var(--brand, #fa3356)" }}
              aria-hidden="true"
            />
            <div className={styles.projectText}>
              <h2 className={styles.projectTitle}>{project.projectName}</h2>
              <p className={styles.projectMeta}>
                {openCount ? `${openCount} open ${openLabel}` : "No open tasks"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.startButton}
            onClick={() => handleNavigateToProject(project.projectId)}
            aria-label={`Open ${project.projectName} to work on tasks`}
          >
            <Play size={16} /> Start tasks
          </button>
        </header>

        {openCount ? (
          <ul className={styles.taskList}>{project.openTasks.map(renderTask)}</ul>
        ) : (
          <div className={styles.projectEmpty}>All tasks for this project are up to date.</div>
        )}

        {completedCount > 0 && (
          <details className={styles.completedSection}>
            <summary className={styles.completedSummary}>
              <CheckCircle2 size={16} aria-hidden="true" /> Completed ({completedCount})
            </summary>
            <ul className={styles.completedList}>
              {project.completedTasks.map((task) => (
                <li key={task.id} className={styles.completedItem}>
                  <span>{task.title}</span>
                  <span className={styles.completedMeta}>{task.dueLabel ?? "No due date"}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>All tasks</h1>
          <p className={styles.subtitle}>
            Review upcoming tasks across your projects and jump straight into the work that matters most.
          </p>
        </div>
        <div className={styles.summary}>
          <div className={`${styles.summaryStat} ${styles.statOk}`}>
            <span className={styles.summaryLabel}>Completed</span>
            <span className={styles.summaryValue}>{formatStatValue(stats.completed)}</span>
          </div>
          <div className={`${styles.summaryStat} ${styles.statWarn}`}>
            <span className={styles.summaryLabel}>Due Soon</span>
            <span className={styles.summaryValue}>{formatStatValue(stats.dueSoon)}</span>
          </div>
          <div className={`${styles.summaryStat} ${styles.statDanger}`}>
            <span className={styles.summaryLabel}>Overdue</span>
            <span className={styles.summaryValue}>{formatStatValue(stats.overdue)}</span>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        {error ? (
          <div className={styles.state}>We couldn’t load tasks right now. Please try again later.</div>
        ) : loading ? (
          <div className={styles.state}>Loading tasks…</div>
        ) : tasksByProject.length === 0 ? (
          <div className={styles.state}>No tasks yet. Create a project to start planning your work.</div>
        ) : (
          <div className={styles.projectGrid}>{tasksByProject.map(renderProject)}</div>
        )}
      </main>
    </div>
  );
};

export default TasksPage;
