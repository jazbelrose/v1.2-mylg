import React, { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, MoreHorizontal } from "lucide-react";

import { useTasksOverview } from "../hooks/useTasksOverview";
import QuickCreateTaskModal, {
  type QuickCreateTaskModalTask,
} from "./QuickCreateTaskModal";
import styles from "./TasksOverviewCard.module.css";

type TasksOverviewCardProps = {
  className?: string;
};
const TasksOverviewCard: React.FC<TasksOverviewCardProps> = ({ className }) => {
  const { loading, error, stats, groups, refreshTasks, projectOptions, getTaskById } =
    useTasksOverview();
  const location = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<QuickCreateTaskModalTask | null>(null);

  const openCreateModal = useCallback(() => {
    setTaskToEdit(null);
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setTaskToEdit(null);
    setIsCreateModalOpen(false);
  }, []);

  const toModalTask = useCallback(
    (itemId: string) => {
      const source = getTaskById(itemId);
      if (!source) return null;
      const dueDate = source.dueDateInput ?? (source.dueDate ? source.dueDate.toISOString() : null);
      return {
        id: source.id,
        taskId: source.taskId ?? source.id,
        projectId: source.projectId,
        projectName: source.projectName,
        title: source.title,
        description: source.description ?? undefined,
        dueDate,
        status: source.status,
        assigneeId: source.assigneeId ?? undefined,
        address: source.address ?? undefined,
        location: source.location as QuickCreateTaskModalTask["location"],
      } satisfies QuickCreateTaskModalTask;
    },
    [getTaskById],
  );

  const handleChipSelect = useCallback(
    (taskId: string) => {
      const modalTask = toModalTask(taskId);
      if (!modalTask) return;
      setTaskToEdit(modalTask);
      setIsCreateModalOpen(true);
    },
    [toModalTask],
  );

  const formatStatValue = (value: number): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value;
  };

  return (
    <>
      <section
        className={`${styles.card} ${className ?? ""}`.trim()}
        aria-label="Tasks overview"
      >
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            <h3 className={styles.title}>Tasks</h3>
            <p className={styles.subtitle}>Track progress and deadlines across your projects.</p>
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.iconButtonPrimary}`}
              onClick={openCreateModal}
              aria-label="Create a task for any project"
              disabled={!projectOptions.length}
            >
              <Plus size={18} strokeWidth={2} />
            </button>
            <Link
              to="/dashboard/tasks"
              className={styles.iconButton}
              aria-label="View all tasks"
              state={{ from: `${location.pathname}${location.search}` }}
            >
              <MoreHorizontal size={18} strokeWidth={2} />
            </Link>
          </div>
        </header>

        <div className={styles.statGrid}>
          <div className={`${styles.stat} ${styles.statOk}`}>
            <span className={styles.statLabel}>Completed</span>
            <span className={styles.statValue}>{formatStatValue(stats.completed)}</span>
          </div>
          <div className={`${styles.stat} ${styles.statDanger}`}>
            <span className={styles.statLabel}>Overdue</span>
            <span className={styles.statValue}>{formatStatValue(stats.overdue)}</span>
          </div>
          <div className={`${styles.stat} ${styles.statWarn}`}>
            <span className={styles.statLabel}>Due</span>
            <span className={styles.statValue}>{formatStatValue(stats.dueSoon)}</span>
          </div>
        </div>

        {error ? (
          <div className={styles.empty}>We couldn’t load tasks right now. Please try again later.</div>
        ) : groups.length ? (
          <div className={styles.groups}>
            {groups.map((group) => (
              <div key={group.id} className={styles.group}>
                <div className={styles.groupLabel}>{group.dayLabel}</div>
                <div className={styles.chips}>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.chip} ${styles.chipButton}`}
                      onClick={() => handleChipSelect(item.id)}
                    >
                      <span
                        className={styles.chipDot}
                        style={{ backgroundColor: item.color || "var(--brand, #fa3356)" }}
                        aria-hidden="true"
                      />
                      <span className={styles.chipTitle}>{item.title}</span>
                      {(item.time || item.project) && (
                        <span className={styles.chipMeta}>
                          {item.time}
                          {item.time && item.project ? " · " : ""}
                          {item.project}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            {loading ? "Loading tasks…" : "No open tasks are due this week. You’re all caught up!"}
          </div>
        )}
      </section>
      <QuickCreateTaskModal
        open={isCreateModalOpen}
        onClose={closeCreateModal}
        projects={projectOptions}
        onCreated={refreshTasks}
        onUpdated={refreshTasks}
        onDeleted={refreshTasks}
        task={taskToEdit}
      />
    </>
  );
};

export default TasksOverviewCard;









