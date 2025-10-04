import React, { useEffect, useId, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "@/app/contexts/useData";
import { UserLite } from "@/app/contexts/DataProvider";
import { slugify } from "@/shared/utils/slug";
import { getProjectDashboardPath } from "@/shared/utils/projectUrl";
import { prefetchBudgetData } from "@/dashboard/project/features/budget/context/useBudget";
import WelcomeHeader from "@/dashboard/home/components/WelcomeHeader";
import AllProjects from "@/dashboard/home/components/AllProjects";
import ProjectsPanelMobile from "@/dashboard/home/components/ProjectsPanelMobile";
import NotificationsPage from "@/dashboard/home/components/NotificationsPage";
import Messages from "@/dashboard/features/messages";
import Settings from "@/dashboard/home/components/Settings";
import Collaborators from "@/dashboard/home/components/Collaborators";
import SpinnerScreen from "@/shared/ui/SpinnerScreen";
import PendingApprovalScreen from "@/shared/ui/PendingApprovalScreen";
import AllProjectsWeekWidget from "@/dashboard/home/components/AllProjectsWeekWidget";
import WeekWidgetDesktop, { type Track, type Dot } from "@/dashboard/home/components/WeekWidgetDesktop";
import TasksOverviewCard from "@/dashboard/home/components/TasksOverviewCard";
import MobileTasksOverviewCard from "@/dashboard/home/components/MobileTasksOverviewCard";
import NavigationDrawer from "@/shared/ui/NavigationDrawer";
import DashboardNavPanel from "@/shared/ui/DashboardNavPanel";
import ProjectsPanelDesktop from "@/dashboard/home/components/ProjectsPanelDesktop";
import { getColor } from "@/shared/utils/colorUtils";
import { useNavCollapsed } from "@/shared/hooks/useNavCollapsed";
import SkeletonSwap from "@/shared/ui/SkeletonSwap";
import WeekWidgetSkeleton from "@/dashboard/home/components/WeekWidget.skeleton";
import ProjectsPanelSkeleton from "@/dashboard/home/components/ProjectsPanel.skeleton";
import TasksRollupSkeleton from "@/dashboard/home/components/TasksRollup.skeleton";

import "./dashboard-styles.css";

type Project = { projectId: string; title: string };

declare global {
  interface Window {
    hasUnsavedChanges?: () => boolean;
    unsavedChanges?: boolean;
  }
}

type TimelineEvent = { date?: string; description?: string; [k: string]: unknown };
type ProjectWithDetails = {
  projectId: string;
  title?: string;
  color?: string;
  dateCreated?: string;
  finishline?: string;
  timelineEvents?: TimelineEvent[];
};

function toDay(d?: string | Date | number) {
  if (!d) return null;
  const v = d instanceof Date ? d : new Date(d);
  return Number.isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
}
function sameDay(a: Date | null, b: Date | null) {
  return !!(a && b) && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// eslint-disable-next-line react-refresh/only-export-components
export const parseDashboardPath = (
  pathname: string
): { view: string; userSlug: string | null } => {
  const segments = pathname.split("/").filter(Boolean);
  const idx = segments.indexOf("dashboard");

  if (idx === -1) {
    return { view: "welcome", userSlug: null };
  }

  let view = segments[idx + 1] || "welcome";
  let userSlug = segments[idx + 2] || null;

  if (view === "features") {
    view = segments[idx + 2] || "welcome";
    userSlug = segments[idx + 3] || null;
  }

  if (view === "welcome") {
    view = segments[idx + 2] || "welcome";
    userSlug = segments[idx + 3] || null;
  }

  return { view, userSlug };
};

const WelcomeScreen: React.FC = () => {
  const {
    userData,
    userName,
    loadingProfile,
    inbox,
    allUsers,
    projects,
    fetchProjectDetails,
    isLoading: projectsLoading,
  } = useData();

  const location = useLocation();
  const navigate = useNavigate();

  const [weekOf, setWeekOf] = useState<Date>(new Date());

  // Map for consistent colors
  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of (projects as ProjectWithDetails[])) m[p.projectId] = p.color || getColor(p.projectId);
    return m;
  }, [projects]);

  // Bars across the week
  const tracks: Track[] = useMemo(() => {
    return (projects as ProjectWithDetails[])
      .map((p) => {
        const start = toDay(p.dateCreated);
        const end = toDay(p.finishline);
        if (!start || !end || end < start) return null;
        return { id: p.projectId, color: colorMap[p.projectId] || "#FA3356", start, end };
      })
      .filter(Boolean) as Track[];
  }, [projects, colorMap]);

  // Dots from timeline events
  const dots: Dot[] = useMemo(() => {
    const out: Dot[] = [];
    for (const p of (projects as ProjectWithDetails[])) {
      for (const ev of p.timelineEvents ?? []) {
        const d = toDay(ev.date);
        if (d) out.push({ date: d, color: colorMap[p.projectId] || "#FA3356" });
      }
    }
    return out;
  }, [projects, colorMap]);

  // 👉 Tooltip data for a tapped day (projects running that day + same-day events)
  const getTooltipItems = (date: Date) => {
    const day = toDay(date)!;
    const items: { id: string; title?: string; color?: string; note?: string; onSelect?: () => void }[] = [];

    for (const p of (projects as ProjectWithDetails[])) {
      const color = colorMap[p.projectId] || "#FA3356";
      const start = toDay(p.dateCreated);
      const end = toDay(p.finishline);

      if (start && end && day >= start && day <= end) {
        items.push({
          id: p.projectId,
          title: p.title || p.projectId,
          color,
          onSelect: () => void handleNavigateToProject({ projectId: p.projectId }),
        });
      }
      for (const ev of p.timelineEvents ?? []) {
        const d = toDay(ev.date);
        if (sameDay(d, day)) {
          const note = (ev.description as string) || undefined;
          const hit = items.find((i) => i.id === p.projectId);
          if (hit) {
            hit.note ??= note;
            if (!hit.onSelect) hit.onSelect = () => void handleNavigateToProject({ projectId: p.projectId });
          } else {
            items.push({
              id: p.projectId,
              title: p.title || p.projectId,
              color,
              note,
              onSelect: () => void handleNavigateToProject({ projectId: p.projectId }),
            });
          }
        }
      }
    }
    return items;
  };

  const parsePath = () => parseDashboardPath(location.pathname);

  const { view: initialView, userSlug: initialDMUserSlug } = parsePath();
  const [activeView, setActiveView] = useState<string>(initialView);
  const [dmUserSlug, setDmUserSlug] = useState<string | null>(
    initialDMUserSlug
  );
  const computeViewportFlags = React.useCallback(() => {
    if (typeof window === "undefined") {
      return { isMobile: false, isDesktop: false };
    }

    const width = window.innerWidth;

    return {
      isMobile: width < 768,
      isDesktop: width >= 1024,
    };
  }, []);
  const [{ isMobile, isDesktop }, setViewportFlags] = useState(() =>
    computeViewportFlags()
  );
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useNavCollapsed("dashboard");
  const [isTasksLoading, setIsTasksLoading] = useState(true);
  const rawDrawerId = useId();
  const drawerId = React.useMemo(
    () => `dashboard-nav-${rawDrawerId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawDrawerId]
  );

  useEffect(() => {
    setIsTasksLoading(true);
  }, [isDesktop]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      setViewportFlags(computeViewportFlags());
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [computeViewportFlags]);

  useEffect(() => {
    if (isDesktop) {
      setIsNavigationOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) {
      setIsNavCollapsed(false);
    }
  }, [isDesktop, setIsNavCollapsed]);

  const handleNavigateToProject = async ({
    projectId,
  }: {
    projectId?: string;
  }) => {
    if (!projectId) return;

    const hasUnsaved =
      (typeof window.hasUnsavedChanges === "function" &&
        window.hasUnsavedChanges()) ||
      window.unsavedChanges === true;

    if (hasUnsaved) {
      const confirmLeave = window.confirm(
        "You have unsaved changes, continue?"
      );
      if (!confirmLeave) return;
    }

    const proj = projects.find((p: Project) => p.projectId === projectId);
    const path = getProjectDashboardPath(projectId, proj?.title);

    navigate(path);

    const fetchPromise = Promise.all([
      fetchProjectDetails(projectId),
      prefetchBudgetData(projectId),
    ]).catch((error) => {
      console.error("Failed to prefetch project resources", error);
    });

    void fetchPromise;
  };

  useEffect(() => {
    const { view, userSlug } = parsePath();
    if (view !== activeView) setActiveView(view);
    if (userSlug !== dmUserSlug) setDmUserSlug(userSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (
      !isMobile &&
      activeView === "messages" &&
      !dmUserSlug &&
      inbox &&
      inbox.length > 0 &&
      userData
    ) {
      const sorted = [...inbox].sort(
        (a, b) =>
          new Date(b.lastMsgTs).getTime() - new Date(a.lastMsgTs).getTime()
      );
      const lastThread = sorted[0];

      if (lastThread) {
        const otherId =
          lastThread.otherUserId ||
          lastThread.conversationId
            .replace("dm#", "")
            .split("___")
            .find((id) => id !== userData.userId);

        if (otherId) {
          const user = allUsers.find((u: UserLite) => u.userId === otherId);
          const slug = user
            ? slugify(`${user.firstName}-${user.lastName}`)
            : otherId;
          setDmUserSlug(slug);
          navigate(`/dashboard/features/messages/${slug}`, { replace: true });
        }
      }
    }
  }, [activeView, dmUserSlug, inbox, userData, allUsers, navigate, isMobile]);

  if (loadingProfile) return <SpinnerScreen />;
  if (userData?.pending) return <PendingApprovalScreen />;


  const renderWelcomeView = () => {
    if (isDesktop) {
      return (
        <div className="welcome-desktop-layout">
          <section
            id="calendar"
            className="welcome-section-anchor welcome-desktop-header"
          >
            <SkeletonSwap
              ready={!projectsLoading}
              skeleton={
                <WeekWidgetSkeleton
                  variant="desktop"
                  className="skeleton-reserve-week-widget"
                />
              }
              className="skeleton-reserve-week-widget"
            >
              <WeekWidgetDesktop
                weekOf={weekOf}
                tracks={tracks}
                dots={dots}
                onPrevWeek={(d) => setWeekOf(d)}
                onNextWeek={(d) => setWeekOf(d)}
                onSelectDate={(d) => setWeekOf(d)}
                getTooltipItems={getTooltipItems}
              />
            </SkeletonSwap>
          </section>
          <section
            id="projects"
            className="welcome-section-anchor welcome-desktop-projects"
          >
            <div className="welcome-desktop-projects-scroll">
              <SkeletonSwap
                ready={!projectsLoading}
                skeleton={
                  <ProjectsPanelSkeleton
                    variant="desktop"
                    className="skeleton-reserve-projects"
                  />
                }
                className="skeleton-reserve-projects"
              >
                <ProjectsPanelDesktop
                  onOpenProject={(projectId) =>
                    handleNavigateToProject({ projectId })
                  }
                />
              </SkeletonSwap>
            </div>
          </section>

          <section
            id="tasks"
            className="welcome-section-anchor welcome-desktop-footer"
          >
            <SkeletonSwap
              ready={!isTasksLoading}
              skeleton={
                <TasksRollupSkeleton
                  variant="desktop"
                  className="welcome-header-tasks-card skeleton-reserve-tasks"
                />
              }
              className="welcome-header-tasks-card skeleton-reserve-tasks"
            >
              <TasksOverviewCard
                className="welcome-header-tasks-card"
                onLoadingChange={setIsTasksLoading}
              />
            </SkeletonSwap>
          </section>
        </div>
      );
    }

    return (
      <div className="mobile-welcome-layout">
        <div className="mobile-calendar-section">
          <SkeletonSwap
            ready={!projectsLoading}
            skeleton={
              <WeekWidgetSkeleton
                variant="mobile"
                className="skeleton-reserve-week-widget"
              />
            }
            className="skeleton-reserve-week-widget"
          >
            <AllProjectsWeekWidget />
          </SkeletonSwap>
        </div>
        <div className="mobile-projects-tasks">
          <div className="mobile-projects-section">
            <div className="mobile-projects-panel">
              <SkeletonSwap
                ready={!projectsLoading}
                skeleton={
                  <ProjectsPanelSkeleton
                    variant="mobile"
                    className="skeleton-reserve-projects"
                  />
                }
                className="skeleton-reserve-projects"
              >
                <ProjectsPanelMobile
                  onOpenProject={(projectId) =>
                    handleNavigateToProject({ projectId })
                  }
                />
              </SkeletonSwap>
            </div>
          </div>
          <div className="mobile-tasks-section dashboard-footer">
            <SkeletonSwap
              ready={!isTasksLoading}
              skeleton={
                <TasksRollupSkeleton
                  variant="mobile"
                  className="skeleton-reserve-tasks"
                />
              }
              className="skeleton-reserve-tasks"
            >
              <MobileTasksOverviewCard onLoadingChange={setIsTasksLoading} />
            </SkeletonSwap>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "welcome":
        return renderWelcomeView();
      case "projects":
        return <AllProjects />;
      case "notifications":
        return (
          <NotificationsPage
            onNavigateToProject={(projectId: string) =>
              handleNavigateToProject({ projectId })
            }
          />
        );
      case "messages":
        return <Messages initialUserSlug={dmUserSlug || undefined} />;
      case "settings":
        return <Settings />;
      case "collaborators":
        return <Collaborators />;
      default:
        return null;
    }
  };

  const handleOpenNavigation = () => setIsNavigationOpen(true);
  const handleCloseNavigation = () => setIsNavigationOpen(false);
  const handleToggleNavigationCollapse = () =>
    setIsNavCollapsed((previous) => !previous);

  const mainContent = (
    <main className="dashboard-main">
      <div className="dashboard-wrapper welcome-screen no-vertical-center">
        <WelcomeHeader
          userName={userName}
          setActiveView={setActiveView}
          onToggleNavigation={!isDesktop ? handleOpenNavigation : undefined}
          isNavigationOpen={!isDesktop ? isNavigationOpen : undefined}
          navigationDrawerId={!isDesktop ? drawerId : undefined}
          isDesktopLayout={isDesktop}
        />

        <div className="row-layout">
          <div className="welcome-screen-details">
            <div className="dashboard-content">
              <div
                className={`main-content${
                  activeView === "welcome" && isDesktop
                    ? " main-content--welcome"
                    : ""
                }`}
              >
                {renderActiveView()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );

  if (isDesktop) {
    return (
      <div
        className={`dashboard-root${
          isNavCollapsed ? " dashboard-root--nav-collapsed" : ""
        }`}
      >
        <aside>
          <DashboardNavPanel
            variant="persistent"
            setActiveView={setActiveView}
            isCollapsed={isNavCollapsed}
            onToggleCollapse={handleToggleNavigationCollapse}
          />
        </aside>
        {mainContent}
      </div>
    );
  }

  return (
    <>
      <NavigationDrawer
        open={isNavigationOpen}
        onClose={handleCloseNavigation}
        setActiveView={setActiveView}
        drawerId={drawerId}
      />
      {mainContent}
    </>
  );
};

export default WelcomeScreen;













