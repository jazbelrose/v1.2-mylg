import React from "react";

import {
  SkeletonAvatar,
  SkeletonBox,
  SkeletonText,
  SkeletonThumbnail,
} from "@/shared/ui/Skeleton";
import desktopPanelStyles from "../components/ProjectsPanelDesktop.module.css";
import projectsPanelStyles from "../components/projects-panel.module.css";
import tasksCardStyles from "../components/TasksOverviewCard.module.css";
import mobileTasksStyles from "../components/MobileTasksOverviewCard.module.css";

type DashboardHomeSkeletonProps = {
  isDesktop: boolean;
  isMobile: boolean;
  busy: boolean;
  hidden?: boolean;
};

const HeaderSkeleton: React.FC<{ isDesktop: boolean; isMobile: boolean }> = ({
  isDesktop,
  isMobile,
}) => {
  const chips = Array.from({ length: isDesktop ? 4 : 3 });

  return (
    <div className="welcome-header">
      <div className="welcome-header-desktop">
        <div className="welcome-header-left flex items-center gap-2">
          <SkeletonBox radius="card" style={{ width: isMobile ? 34 : 40, height: isMobile ? 34 : 40 }} />
          {!isDesktop ? (
            <SkeletonBox radius="card" style={{ width: 36, height: 36 }} />
          ) : null}
        </div>

        {isDesktop ? (
          <div className="welcome-header-greeting">
            <SkeletonText width="240px" className="h-6" />
          </div>
        ) : null}

        <div className="welcome-header-right flex items-center gap-3">
          {isDesktop ? (
            <div className="welcome-header-search">
              <SkeletonBox radius="card" style={{ width: "100%", height: 44 }} />
            </div>
          ) : (
            <SkeletonText width="45%" className="h-5" />
          )}

          <div className="welcome-header-actions flex items-center gap-2">
            <SkeletonBox radius="full" style={{ width: 36, height: 36 }} />
            <SkeletonBox radius="full" style={{ width: 36, height: 36 }} />
            <SkeletonAvatar size={isMobile ? 34 : 40} />
          </div>
        </div>
      </div>

      <div className="welcome-header-extras">
        <div className="welcome-header-toc flex flex-wrap gap-2">
          {chips.map((_, index) => (
            <SkeletonBox
              key={index}
              radius="line"
              style={{ width: isDesktop ? 120 : 94, height: 30 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const WeekWidgetSkeleton: React.FC<{ variant: "desktop" | "mobile" }> = ({ variant }) => {
  const isDesktop = variant === "desktop";
  const dayCount = isDesktop ? 7 : 7;

  return (
    <div
      className={`week-widget ${isDesktop ? "week-widget--desktop" : "week-widget--mobile"}`}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-3 week-widget-header">
        <SkeletonText width={isDesktop ? "200px" : "160px"} className="h-6" />
        <div className="flex items-center gap-2">
          <SkeletonBox radius="line" style={{ width: 34, height: 34 }} />
          <SkeletonBox radius="line" style={{ width: 34, height: 34 }} />
        </div>
      </div>

      <div className="flex gap-2 week-days" style={{ marginBottom: 12 }}>
        {Array.from({ length: dayCount }).map((_, index) => (
          <SkeletonBox key={index} radius="inherit" className="week-day" />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <SkeletonBox radius="line" style={{ width: "100%", height: 12 }} />
        <SkeletonBox radius="line" style={{ width: "75%", height: 12 }} />
      </div>
    </div>
  );
};

const ProjectsDesktopSkeleton: React.FC = () => (
  <section
    aria-hidden="true"
    className={`${desktopPanelStyles.card} flex flex-col gap-5`}
    style={{ minHeight: 420 }}
  >
    <header className={desktopPanelStyles.header}>
      <div className={desktopPanelStyles.headerTop}>
        <div className={projectsPanelStyles.titleWrap}>
          <SkeletonText width="120px" className={`${projectsPanelStyles.title} h-6`} radius="inherit" />
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonAvatar key={index} size={32} />
            ))}
          </div>
        </div>
      </div>

      <div className={`${projectsPanelStyles.kpis} flex gap-2`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBox
            key={index}
            radius="inherit"
            className={projectsPanelStyles.chip}
            style={{ height: 32, minWidth: 96 }}
          />
        ))}
      </div>
    </header>

    <div className={`${desktopPanelStyles.content} flex flex-col gap-3`} style={{ minHeight: 300 }}>
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonBox key={index} radius="line" style={{ height: 56 }} />
      ))}
    </div>
  </section>
);

const ProjectsMobileSkeleton: React.FC = () => (
  <div className={`${projectsPanelStyles.panel} flex flex-col gap-4`} style={{ minHeight: 320 }} aria-hidden="true">
    <div className={projectsPanelStyles.header}>
      <div className={projectsPanelStyles.titleWrap}>
        <SkeletonText width="110px" className={`${projectsPanelStyles.title} h-5`} radius="inherit" />
      </div>
      <SkeletonBox radius="full" style={{ width: 28, height: 28 }} />
    </div>

    <div className={`${projectsPanelStyles.kpis} flex gap-2`}>
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonBox
          key={index}
          radius="inherit"
          className={projectsPanelStyles.chip}
          style={{ height: 28, minWidth: 88 }}
        />
      ))}
    </div>

    <div className="flex flex-col gap-3" style={{ minHeight: 220 }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <SkeletonBox key={index} radius="line" style={{ height: 52 }} />
      ))}
    </div>
  </div>
);

const TasksDesktopSkeleton: React.FC = () => (
  <section
    aria-hidden="true"
    className={`${tasksCardStyles.card} flex flex-col gap-4`}
    style={{ minHeight: 360 }}
  >
    <div className={`${tasksCardStyles.header} flex flex-wrap gap-4`}>
      <div className={`${tasksCardStyles.titleWrap} flex flex-col gap-2`}>
        <SkeletonText width="120px" className="h-5" />
        <SkeletonText width="200px" className="h-4" />
      </div>
      <div className={`${tasksCardStyles.actions} flex items-center gap-2`}>
        <SkeletonBox radius="full" style={{ width: 36, height: 36 }} />
        <SkeletonBox radius="full" style={{ width: 36, height: 36 }} />
      </div>
    </div>

    <div className={tasksCardStyles.statGrid}>
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonBox
          key={index}
          radius="inherit"
          className={`${tasksCardStyles.stat} flex flex-col gap-2`}
        >
          <SkeletonText width="40%" className="h-3" />
          <SkeletonText width="35%" className="h-5" />
        </SkeletonBox>
      ))}
    </div>

    <div className={`${tasksCardStyles.groups} flex flex-col gap-3`}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className={`${tasksCardStyles.group} flex flex-col gap-2`}>
          <SkeletonText width="120px" className="h-3" />
          <div className={`${tasksCardStyles.chips} flex flex-wrap gap-2`}>
            {Array.from({ length: 2 }).map((_, chipIndex) => (
              <SkeletonBox
                key={chipIndex}
                radius="inherit"
                className={tasksCardStyles.chip}
                style={{ height: 32, minWidth: 120 }}
              >
                <div className="flex items-center gap-2">
                  <SkeletonAvatar size={10} />
                  <SkeletonText width="70%" className="h-3" />
                </div>
              </SkeletonBox>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const TasksMobileSkeleton: React.FC = () => (
  <section
    aria-hidden="true"
    className={`${mobileTasksStyles.card} flex flex-col gap-3`}
    style={{ minHeight: 240 }}
  >
    <div className={`${mobileTasksStyles.header} flex items-center justify-between gap-3`}>
      <SkeletonText width="110px" className="h-5" />
      <SkeletonText width="60px" className="h-4" />
    </div>

    <div className={`${mobileTasksStyles.statRow} flex gap-2`}>
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonBox
          key={index}
          radius="inherit"
          className={`${mobileTasksStyles.stat} flex flex-col gap-2`}
        >
          <SkeletonText width="35%" className="h-5" />
          <SkeletonText width="50%" className="h-3" />
        </SkeletonBox>
      ))}
    </div>

    <SkeletonText width="80%" className={`${mobileTasksStyles.status} h-4`} />
  </section>
);

const GalleriesSkeleton: React.FC<{ isDesktop: boolean }> = ({ isDesktop }) => (
  <div className="flex w-full gap-3" aria-hidden="true" style={{ minHeight: isDesktop ? 140 : 120 }}>
    {Array.from({ length: isDesktop ? 4 : 2 }).map((_, index) => (
      <SkeletonThumbnail
        key={index}
        radius="card"
        aspect="16 / 9"
        style={{ flex: 1, minWidth: 0 }}
      />
    ))}
  </div>
);

const DesktopLayoutSkeleton: React.FC = () => (
  <div className="welcome-desktop-layout" aria-hidden="true">
    <section className="welcome-section-anchor welcome-desktop-header">
      <WeekWidgetSkeleton variant="desktop" />
    </section>

    <section className="welcome-section-anchor welcome-desktop-projects flex flex-col gap-5">
      <ProjectsDesktopSkeleton />
      <GalleriesSkeleton isDesktop />
    </section>

    <section className="welcome-section-anchor welcome-desktop-footer flex flex-col gap-5">
      <TasksDesktopSkeleton />
    </section>
  </div>
);

const MobileLayoutSkeleton: React.FC = () => (
  <div className="mobile-welcome-layout" aria-hidden="true">
    <div className="mobile-calendar-section">
      <WeekWidgetSkeleton variant="mobile" />
    </div>

    <div className="mobile-projects-tasks flex flex-col gap-4">
      <div className="mobile-projects-section">
        <div className="mobile-projects-panel">
          <ProjectsMobileSkeleton />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <GalleriesSkeleton isDesktop={false} />
        <div className="mobile-tasks-section dashboard-footer">
          <TasksMobileSkeleton />
        </div>
      </div>
    </div>
  </div>
);

const DashboardHomeSkeleton: React.FC<DashboardHomeSkeletonProps> = ({
  isDesktop,
  isMobile,
  busy,
  hidden = false,
}) => {
  const layout = isDesktop ? <DesktopLayoutSkeleton /> : <MobileLayoutSkeleton />;

  return (
    <div
      role="status"
      aria-busy={busy}
      aria-hidden={hidden}
      aria-live="polite"
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      <div className="dashboard-wrapper welcome-screen no-vertical-center">
        <HeaderSkeleton isDesktop={isDesktop} isMobile={isMobile} />
        <div className="row-layout">
          <div className="welcome-screen-details">
            <div className="dashboard-content">
              <div className={`main-content${isDesktop ? " main-content--welcome" : ""}`}>
                {layout}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardHomeSkeleton);
