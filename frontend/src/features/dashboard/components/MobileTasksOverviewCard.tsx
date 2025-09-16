import React, { useMemo } from "react";

import Squircle from "@/shared/ui/Squircle";

import { useTasksOverview } from "./useTasksOverview";
import styles from "./MobileTasksOverviewCard.module.css";

const CARD_RADIUS = 20;
const MAX_COMPACT_GROUPS = 2;
const MAX_COMPACT_ITEMS = 2;

type Props = {
  className?: string;
  compact?: boolean;
};

const MobileTasksOverviewCard: React.FC<Props> = ({ className, compact = false }) => {
  const { loading, error, stats, groups, handleNavigateToPrimary, handleViewAll, canNavigateToProject } =
    useTasksOverview();

  const formatStatValue = (value: number): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value;
  };

  const cardClassName = useMemo(
    () => [styles.card, className || ""].filter(Boolean).join(" "),
    [className]
  );

  const limitedGroups = useMemo(() => {
    if (!compact) return groups;
    return groups.slice(0, MAX_COMPACT_GROUPS);
  }, [compact, groups]);

  const hiddenGroupCount = compact ? Math.max(0, groups.length - limitedGroups.length) : 0;

  return (
    <Squircle
      as="section"
      radius={CARD_RADIUS}
      smoothing={0.6}
      className={cardClassName}
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
      ) : limitedGroups.length ? (
        <div className={styles.groups}>
          {limitedGroups.map((group) => {
            const items = compact ? group.items.slice(0, MAX_COMPACT_ITEMS) : group.items;
            const hiddenItems = compact
              ? Math.max(0, group.items.length - items.length)
              : 0;

            return (
              <div key={group.id} className={styles.group}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupDay}>{group.dayLabel}</span>
                  <span className={styles.groupCount}>
                    {group.items.length} {group.items.length === 1 ? "task" : "tasks"}
                  </span>
                </div>
                <ul className={styles.items}>
                  {items.map((item) => (
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
                  {hiddenItems > 0 && (
                    <li className={`${styles.item} ${styles.itemMore}`} aria-hidden>
                      +{hiddenItems} more
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
          {hiddenGroupCount > 0 && (
            <div className={styles.moreGroups} aria-hidden>
              +{hiddenGroupCount} more days
            </div>
          )}
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
