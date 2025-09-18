import React from "react";
import { Plus, MoreHorizontal } from "lucide-react";

import { useTasksOverview } from "../hooks/useTasksOverview";
import styles from "./TasksOverviewCard.module.css";

type TasksOverviewCardProps = {
  className?: string;
};
const TasksOverviewCard: React.FC<TasksOverviewCardProps> = ({ className }) => {
  const { loading, error, stats, groups, handleNavigateToPrimary, handleViewAll, canNavigateToProject } =
    useTasksOverview();

  const formatStatValue = (value: number): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value;
  };

  return (
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
            onClick={handleNavigateToPrimary}
            aria-label="Add or review tasks for the next project"
            disabled={!canNavigateToProject}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleViewAll}
            aria-label="View all projects"
          >
            <MoreHorizontal size={18} strokeWidth={2} />
          </button>
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
                  <div key={item.id} className={styles.chip}>
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
                  </div>
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
  );
};

export default TasksOverviewCard;
