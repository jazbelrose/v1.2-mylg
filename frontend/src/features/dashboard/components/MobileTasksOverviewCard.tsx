import React from "react";

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

  const statusMessage = React.useMemo(() => {
    if (error) return "We couldn’t load tasks right now.";
    if (loading) return "Loading tasks…";
    if (!groups.length) return "No open tasks this week.";

    const nextGroup = groups[0];
    if (!nextGroup) return "You're up to date.";

    const count = nextGroup.items.length;
    const noun = count === 1 ? "task" : "tasks";
    return `${count} ${noun} due ${nextGroup.dayLabel}.`;
  }, [error, loading, groups]);

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

      <p className={styles.status}>{statusMessage}</p>
    </Squircle>
  );
};

export default MobileTasksOverviewCard;
