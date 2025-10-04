import React from "react";

import "./week-widget.css";

type WeekWidgetSkeletonProps = {
  variant?: "desktop" | "mobile";
  className?: string;
};

const DAY_COUNT = 7;

const WeekWidgetSkeleton: React.FC<WeekWidgetSkeletonProps> = ({ variant = "desktop", className = "" }) => {
  const classes = [
    "week-widget",
    variant === "desktop" ? "week-widget--desktop" : "week-widget--mobile",
    "skeleton-week-widget",
    className,
    variant === "mobile" ? "skeleton-week-widget--mobile" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-hidden="true">
      <div className="skeleton-week-widget__header">
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 auto" }}>
          <span className="skel skel-rounded-md skeleton-week-widget__title" />
          <span className="skel skel-rounded-md skeleton-week-widget__subtitle" />
        </div>
        <div className="skeleton-week-widget__actions">
          <span className="skel skel-rounded-lg skeleton-week-widget__button" />
          <span className="skel skel-rounded-lg skeleton-week-widget__button" />
        </div>
      </div>
      <div className="skeleton-week-widget__days">
        {Array.from({ length: DAY_COUNT }).map((_, index) => (
          <span key={index} className="skel skel-rounded-2xl skeleton-week-widget__day" />
        ))}
      </div>
      <div className="skeleton-week-widget__bars">
        <span className="skel skel-rounded-full skeleton-week-widget__bar" />
        <span className="skel skel-rounded-full skeleton-week-widget__bar skeleton-week-widget__bar--short" />
      </div>
    </div>
  );
};

export default WeekWidgetSkeleton;
