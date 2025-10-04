import React from "react";

import desktopStyles from "./TasksOverviewCard.module.css";
import mobileStyles from "./MobileTasksOverviewCard.module.css";

type TasksRollupSkeletonProps = {
  variant?: "desktop" | "mobile";
  className?: string;
};

const METRIC_COUNT = 3;
const GROUP_COUNT = 2;
const CHIPS_PER_GROUP = 3;

const TasksRollupSkeleton: React.FC<TasksRollupSkeletonProps> = ({ variant = "desktop", className = "" }) => {
  if (variant === "mobile") {
    const classes = [mobileStyles.card, "skeleton-tasks", "skeleton-tasks--mobile", className]
      .filter(Boolean)
      .join(" ");

    return (
      <section className={classes} aria-hidden="true">
        <header className={mobileStyles.header}>
          <span className="skel skel-rounded-md skeleton-tasks__title" />
          <span className="skel skel-rounded-full" style={{ width: "64px", height: "16px" }} />
        </header>
        <div className={`${mobileStyles.statRow} skeleton-tasks__metrics`}>
          {Array.from({ length: METRIC_COUNT }).map((_, index) => (
            <span key={index} className="skel skel-rounded-xl skeleton-tasks__metric" />
          ))}
        </div>
        <span className="skel skel-rounded-md skeleton-tasks__caption" />
      </section>
    );
  }

  const classes = [desktopStyles.card, "skeleton-tasks", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-hidden="true">
      <header className={desktopStyles.header}>
        <div className={desktopStyles.titleWrap}>
          <span className="skel skel-rounded-md skeleton-tasks__title" />
          <span className="skel skel-rounded-md skeleton-tasks__subtitle" />
        </div>
        <div className="skeleton-tasks__actions">
          <span className="skel skel-rounded-lg skeleton-tasks__action" />
          <span className="skel skel-rounded-lg skeleton-tasks__action" />
        </div>
      </header>
      <div className={`${desktopStyles.statGrid} skeleton-tasks__metrics`}>
        {Array.from({ length: METRIC_COUNT }).map((_, index) => (
          <span key={index} className="skel skel-rounded-xl skeleton-tasks__metric" />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {Array.from({ length: GROUP_COUNT }).map((_, index) => (
          <div key={index} className="skeleton-tasks__group">
            <span className="skel skel-rounded-md skeleton-tasks__group-label" />
            <div className="skeleton-tasks__group-chips">
              {Array.from({ length: CHIPS_PER_GROUP }).map((__, chipIndex) => (
                <span key={chipIndex} className="skel skel-rounded-full skeleton-tasks__group-chip" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="skel skel-rounded-md skeleton-tasks__caption" />
    </section>
  );
};

export default TasksRollupSkeleton;
