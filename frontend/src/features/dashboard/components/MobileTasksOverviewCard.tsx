import React from "react";

import Squircle from "@/shared/ui/Squircle";

import { useTasksOverview } from "./useTasksOverview";
import styles from "./MobileTasksOverviewCard.module.css";

const CARD_RADIUS = 20;

const MobileTasksOverviewCard: React.FC = () => {
  const { loading, error, stats, groups, handleNavigateToPrimary, handleViewAll, canNavigateToProject } =
    useTasksOverview();

  const formatStatValue = (value: number): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value;
  };

  return (
    <Squircle
      as="section"
      radius={CARD_RADIUS}
      smoothing={0.6}
      className={styles.card}
      aria-label="Tasks overview"
    >
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>Tasks</h3>
          <p className={styles.subtitle}>Stay on top of what’s due this week.</p>
        </div>
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

      {error ? (
        <div className={styles.empty}>We couldn’t load tasks right now. Please try again later.</div>
      ) : groups.length ? (
        <div className={styles.groups}>
          {groups.map((group) => (
            <div key={group.id} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.groupDay}>{group.dayLabel}</span>
                <span className={styles.groupCount}>
                  {group.items.length} {group.items.length === 1 ? "task" : "tasks"}
                </span>
              </div>
              <ul className={styles.items}>
                {group.items.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <span
                      className={styles.itemDot}
                      style={{ backgroundColor: item.color || "var(--brand, #fa3356)" }}
                      aria-hidden="true"
                    />
                    <div className={styles.itemBody}>
                      <span className={styles.itemTitle}>{item.title}</span>
                      {(item.time || item.project) && (
                        <span className={styles.itemMeta}>
                          {item.time}
                          {item.time && item.project ? " · " : ""}
                          {item.project}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          {loading ? "Loading tasks…" : "No open tasks are due this week. You’re all caught up!"}
        </div>
      )}

      <div className={styles.footerActions}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleNavigateToPrimary}
          disabled={!canNavigateToProject}
        >
          Review next project
        </button>
      </div>
    </Squircle>
  );
};

export default MobileTasksOverviewCard;
