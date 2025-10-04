import React from "react";

import desktopStyles from "./ProjectsPanelDesktop.module.css";
import mobileStyles from "./projects-panel.module.css";

type ProjectsPanelSkeletonProps = {
  variant?: "desktop" | "mobile";
  className?: string;
};

const AVATAR_COUNT = 6;
const ROW_COUNT = 5;
const KPI_COUNT = 3;

const ProjectsPanelSkeleton: React.FC<ProjectsPanelSkeletonProps> = ({ variant = "desktop", className = "" }) => {
  if (variant === "mobile") {
    const classes = [
      mobileStyles.panel,
      mobileStyles.panelFullBleed,
      "skeleton-projects-panel",
      "skeleton-projects-panel--mobile",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <section className={classes} aria-hidden="true">
        <header className={mobileStyles.header}>
          <div className={mobileStyles.titleWrap}>
            <span className="skel skel-rounded-md skeleton-projects-panel__title" />
            <div className="skeleton-projects-panel__avatars">
              {Array.from({ length: AVATAR_COUNT }).map((_, index) => (
                <span key={index} className="skel skel-rounded-lg skeleton-projects-panel__avatar" />
              ))}
            </div>
          </div>
          <span className="skel skel-rounded-full skeleton-projects-panel__tag" />
        </header>
        <div className={mobileStyles.kpis}>
          {Array.from({ length: KPI_COUNT }).map((_, index) => (
            <span key={index} className="skel skel-rounded-full skeleton-projects-panel__tag" style={{ width: "96px", height: "18px" }} />
          ))}
        </div>
        <div className="skeleton-projects-panel__list">
          {Array.from({ length: ROW_COUNT }).map((_, index) => (
            <div key={index} className="skeleton-projects-panel__row">
              <span className="skel skel-rounded-lg skeleton-projects-panel__icon" />
              <div className="skeleton-projects-panel__text">
                <span className="skel skel-rounded-md skeleton-projects-panel__line" />
                <span className="skel skel-rounded-md skeleton-projects-panel__line skeleton-projects-panel__line--sm" />
              </div>
            </div>
          ))}
        </div>
        <span className="skel skel-rounded-xl skeleton-projects-panel__footer" />
      </section>
    );
  }

  const classes = [
    desktopStyles.card,
    "week-widget",
    "week-widget--desktop",
    "skeleton-projects-panel",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} aria-hidden="true">
      <header className={desktopStyles.header}>
        <div className={desktopStyles.headerTop}>
          <div className={mobileStyles.titleWrap}>
            <span className="skel skel-rounded-md skeleton-projects-panel__title" />
            <div className="skeleton-projects-panel__avatars">
              {Array.from({ length: AVATAR_COUNT }).map((_, index) => (
                <span key={index} className="skel skel-rounded-lg skeleton-projects-panel__avatar" />
              ))}
            </div>
          </div>
          <span className="skel skel-rounded-full skeleton-projects-panel__tag" />
        </div>
        <div className={mobileStyles.kpis}>
          {Array.from({ length: KPI_COUNT }).map((_, index) => (
            <span key={index} className="skel skel-rounded-full skeleton-projects-panel__tag" style={{ width: "110px", height: "20px" }} />
          ))}
        </div>
      </header>
      <div className={desktopStyles.content}>
        <div className="skeleton-projects-panel__list">
          {Array.from({ length: ROW_COUNT }).map((_, index) => (
            <div key={index} className="skeleton-projects-panel__row">
              <span className="skel skel-rounded-lg skeleton-projects-panel__icon" />
              <div className="skeleton-projects-panel__text">
                <span className="skel skel-rounded-md skeleton-projects-panel__line" />
                <span className="skel skel-rounded-md skeleton-projects-panel__line skeleton-projects-panel__line--sm" />
              </div>
              <span className="skel skel-rounded-md skeleton-projects-panel__date" />
            </div>
          ))}
        </div>
      </div>
      <span className="skel skel-rounded-xl skeleton-projects-panel__footer" />
    </section>
  );
};

export default ProjectsPanelSkeleton;
