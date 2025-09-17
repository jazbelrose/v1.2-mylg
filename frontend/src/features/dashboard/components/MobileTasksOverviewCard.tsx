import React, { useMemo } from "react";

import Squircle from "@/shared/ui/Squircle";

import { useTasksOverview } from "./useTasksOverview";
import styles from "./MobileTasksOverviewCard.module.css";

const CARD_RADIUS = 20;

const MobileTasksOverviewCard: React.FC = () => {
  const { loading, error, stats, groups, handleViewAll } = useTasksOverview();

  const formatStatValue = (value: number): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value;
  };

  const statusMessage = useMemo(() => {
    if (error) return "Tasks unavailable. Try again soon.";
    if (loading) return "Checking tasks…";

    const hasOpenTasks = groups.some((group) => group.items.length > 0);
    if (!hasOpenTasks) {
      return "No open tasks this week.";
    }

    if (stats.overdue > 0) {
      return `${stats.overdue} overdue ${stats.overdue === 1 ? "task" : "tasks"}.`;
    }

    if (stats.dueSoon > 0) {
      return `${stats.dueSoon} due soon.`;
    }

    return "You're on track.";
  }, [error, loading, groups, stats.overdue, stats.dueSoon]);

  return (
    <Squircle
      as="section"
      radius={CARD_RADIUS}
      smoothing={0.6}
      className={styles.card}
      aria-label="Tasks overview"
    >
      <header className={styles.header}>
        <h3 className={styles.title}>Tasks</h3>
        <button type="button" className={styles.viewAllButton} onClick={handleViewAll}>
          View all
        </button>
      </header>

      <div className={styles.statRow}>
        <div className={`${styles.stat} ${styles.statOk}`}>
          <span className={styles.statValue}>{formatStatValue(stats.completed)}</span>
          <span className={styles.statLabel}>Done</span>
        </div>
        <div className={`${styles.stat} ${styles.statDanger}`}>
          <span className={styles.statValue}>{formatStatValue(stats.overdue)}</span>
          <span className={styles.statLabel}>Overdue</span>
        </div>
        <div className={`${styles.stat} ${styles.statWarn}`}>
          <span className={styles.statValue}>{formatStatValue(stats.dueSoon)}</span>
          <span className={styles.statLabel}>Due</span>
        </div>
      </div>

      {statusMessage ? <div className={styles.status}>{statusMessage}</div> : null}
    </Squircle>
  );
};

export default MobileTasksOverviewCard;
