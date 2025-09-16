import React, { useEffect, useId, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "@/app/contexts/useData";
import { UserLite } from "@/app/contexts/DataProvider";
import { slugify } from "@/shared/utils/slug";
import { prefetchBudgetData } from "@/features/budget/context/useBudget";
import WelcomeHeader from "@/features/dashboard/components/WelcomeHeader";
import TopBar from "@/features/dashboard/components/TopBar";
import AllProjects from "@/features/dashboard/components/AllProjects";
import ProjectsPanel from "@/features/dashboard/components/ProjectsPanel";
import NotificationsPage from "@/features/dashboard/components/NotificationsPage";
import Messages from "@/features/messages";
import Settings from "@/features/dashboard/components/Settings";
import Collaborators from "@/features/dashboard/components/Collaborators";
import SpinnerScreen from "@/shared/ui/SpinnerScreen";
import PendingApprovalScreen from "@/shared/ui/PendingApprovalScreen";
import AllProjectsWeekWidget from "@/features/dashboard/components/AllProjectsWeekWidget";
import TasksOverviewCard from "@/features/dashboard/components/TasksOverviewCard";
import MobileTasksOverviewCard from "@/features/dashboard/components/MobileTasksOverviewCard";
import NavigationDrawer from "@/shared/ui/NavigationDrawer";
import DashboardNavPanel from "@/shared/ui/DashboardNavPanel";
import ProjectsPanelDesktop from "@/features/projects/ProjectsPanelDesktop";

import "./dashboard-styles.css";

type Project = { projectId: string; title: string };

declare global {
  interface Window {
    hasUnsavedChanges?: () => boolean;
    unsavedChanges?: boolean;
  }
}

const WelcomeScreen: React.FC = () => {
  const {
    userData,
    userName,
    loadingProfile,
    inbox,
    allUsers,
    projects,
    fetchProjectDetails,
  } = useData();

  const location = useLocation();
  const navigate = useNavigate();

  const parsePath = () => {
    const segments = location.pathname.split("/").filter(Boolean);
    const idx = segments.indexOf("dashboard");
    let view = segments[idx + 1] || "welcome";
    let userSlug = segments[idx + 2] || null;

    if (view === "welcome") {
      view = segments[idx + 2] || "welcome";
      userSlug = segments[idx + 3] || null;
    }
    return { view, userSlug };
  };

  const { view: initialView, userSlug: initialDMUserSlug } = parsePath();
  const [activeView, setActiveView] = useState<string>(initialView);
  const [dmUserSlug, setDmUserSlug] = useState<string | null>(initialDMUserSlug);
  const [isMobile, setIsMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const rawDrawerId = useId();
  const drawerId = React.useMemo(
    () => `dashboard-nav-${rawDrawerId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawDrawerId]
  );

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsDesktop(width >= 1024);
    };
    if (typeof window !== "undefined") {
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setIsNavigationOpen(false);
    }
  }, [isDesktop]);

  const handleNavigateToProject = async ({ projectId }: { projectId?: string }) => {
    if (!projectId) return;

    const hasUnsaved =
      (typeof window.hasUnsavedChanges === "function" && window.hasUnsavedChanges()) ||
      window.unsavedChanges === true;

    if (hasUnsaved) {
      const confirmLeave = window.confirm("You have unsaved changes, continue?");
      if (!confirmLeave) return;
    }

    const proj = projects.find((p: Project) => p.projectId === projectId);
    const slug = proj ? slugify(proj.title) : projectId;
    const path = `/dashboard/projects/${slug}`;

    if (location.pathname !== path) {
      await Promise.all([fetchProjectDetails(projectId), prefetchBudgetData(projectId)]);
      navigate(path);
    }
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
        (a, b) => new Date(b.lastMsgTs).getTime() - new Date(a.lastMsgTs).getTime()
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
          const slug = user ? slugify(`${user.firstName}-${user.lastName}`) : otherId;
          setDmUserSlug(slug);
          navigate(`/dashboard/messages/${slug}`, { replace: true });
        }
      }
    }
  }, [activeView, dmUserSlug, inbox, userData, allUsers, navigate, isMobile]);

  if (loadingProfile) return <SpinnerScreen />;
  if (userData?.pending) return <PendingApprovalScreen />;

  // Hide TopBar and QuickStats for these views
  const isFullWidthView = ["projects", "notifications", "messages", "settings", "collaborators"].includes(
    activeView
  );
  const showTopBar = !isFullWidthView && !isDesktop; // TODO: Remove legacy desktop bento tiles after mobile parity update.

  const renderWelcomeView = () => {
    if (isDesktop) {
      return (
        <div className="dashboard-home-grid">
          <section id="projects" className="welcome-section-anchor">
            <ProjectsPanelDesktop
              onOpenProject={(projectId) => handleNavigateToProject({ projectId })}
            />
          </section>

          <section id="tasks" className="welcome-section-anchor">
            <TasksOverviewCard className="welcome-header-tasks-card" />
          </section>
        </div>
      );
    }

    return (
      <div className="mobile-welcome-layout">
        <div className="mobile-projects-section">
          <ProjectsPanel
            onOpenProject={(projectId) => handleNavigateToProject({ projectId })}
          />
        </div>
        <div className="mobile-tasks-section">
          <MobileTasksOverviewCard />
        </div>
        <div className="mobile-calendar-section">
          <AllProjectsWeekWidget />
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
            {showTopBar && !isMobile && <TopBar setActiveView={setActiveView} />}

            <div
              className={`dashboard-content ${
                isFullWidthView ? "full-width" : ""
              }`}
            >
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
      <div className="dashboard-root">
        <aside>
          <DashboardNavPanel variant="persistent" setActiveView={setActiveView} />
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
