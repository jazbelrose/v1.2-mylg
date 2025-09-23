import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ProjectHeader from "@/dashboard/project/components/Shared/ProjectHeader";

import BudgetOverviewCard from "@/dashboard/project/features/budget/components/BudgetOverviewCard";

import GalleryComponent from "@/dashboard/project/components/Gallery/GalleryComponent";

import ProjectPageLayout from "@/dashboard/project/components/Shared/ProjectPageLayout";
import CalendarOverviewCard from "@/dashboard/project/components/Shared/CalendarOverviewCard";
import QuickLinksComponent from "@/dashboard/project/components/Shared/QuickLinksComponent";
import type { QuickLinksRef } from "@/dashboard/project/components/Shared/QuickLinksComponent";
import LocationComponent from "@/dashboard/project/components/Shared/LocationComponent";
import FileManagerComponent from "@/dashboard/project/components/FileManager/FileManager";
import TasksComponent from "@/dashboard/project/components/Tasks/TasksComponent";
import { BudgetProvider } from "@/dashboard/project/features/budget/context/BudgetProvider";
import { useData } from "@/app/contexts/useData";
import { useSocket } from "@/app/contexts/useSocket";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "@/app/contexts/DataProvider";
import { useProjectPalette } from "@/dashboard/project/hooks/useProjectPalette";
import { resolveProjectCoverUrl } from "@/dashboard/project/utils/theme";
import { getProjectDashboardPath } from "@/shared/utils/projectUrl";

const MOBILE_LAYOUT_WIDTH = 640;

interface LocationState {
  flashDate?: string;
}

const SingleProject: React.FC = () => {
  const {
    activeProject,
    userId,
    fetchProjectDetails,
    setProjects,
    setSelectedProjects,
  } = useData();

  const navigate = useNavigate();
  const location = useLocation();
  const flashDate = (location.state as LocationState)?.flashDate;

  const { projectId } = useParams<{ projectId: string }>();
  const [filesOpen, setFilesOpen] = useState<boolean>(false);
  const quickLinksRef = useRef<QuickLinksRef>(null);
  const { ws } = useSocket();

  const [isMobileBudgetLayout, setIsMobileBudgetLayout] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_LAYOUT_WIDTH;
  });

  const projectNameFromPath = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const projectsIdx = segments.indexOf("projects");
    if (projectsIdx === -1) return undefined;
    const rawSegment = segments[projectsIdx + 2];
    if (!rawSegment) return undefined;
    const cleanSegment = rawSegment.split(/[?#]/)[0] ?? "";
    try {
      return decodeURIComponent(cleanSegment);
    } catch {
      return cleanSegment;
    }
  }, [location.pathname]);

  // Stable helpers
  const noop = useCallback(() => {}, []);

  const parseStatusToNumber = useCallback((status: unknown): number => {
    if (status === undefined || status === null) return 0;
    const str = typeof status === "string" ? status : String(status);
    const num = parseFloat(str.replace("%", ""));
    return Number.isNaN(num) ? 0 : num;
  }, []);

  const coverImage = useMemo(() => resolveProjectCoverUrl(activeProject), [activeProject]);
  const projectPalette = useProjectPalette(coverImage, { color: activeProject?.color });


  const showWelcome = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  const openCalendarPage = useCallback(() => {
    if (!activeProject) return;
    navigate(
      getProjectDashboardPath(activeProject.projectId, activeProject.title, "/calendar")
    );
  }, [activeProject, navigate]);

  const handleProjectDeleted = useCallback(
    (deletedProjectId: string) => {
      setProjects((prev) => prev.filter((p) => p.projectId !== deletedProjectId));
      setSelectedProjects((prev) => prev.filter((id: string) => id !== deletedProjectId));
      navigate("/dashboard/projects");
    },
    [navigate, setProjects, setSelectedProjects]
  );

  const handleActiveProjectChange = useCallback(
    (updatedProject: Project) => {
      if (updatedProject?.projectId) {
        // If child edits metadata and wants to "promote" it to active, ensure details are fresh.
        fetchProjectDetails(updatedProject.projectId);
      }
    },
    [fetchProjectDetails]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobileBudgetLayout(window.innerWidth <= MOBILE_LAYOUT_WIDTH);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Keep the active project in sync with the ID from the route.
  useEffect(() => {
    if (!projectId) return;
    if (activeProject?.projectId === projectId) return;
    fetchProjectDetails(projectId);
  }, [projectId, activeProject?.projectId, fetchProjectDetails]);

  useEffect(() => {
    if (!projectId) return;
    if (activeProject?.projectId !== projectId) return;

    const title = activeProject?.title;
    if (!title) return;

    if (projectNameFromPath === title) return;

    const canonicalPath = getProjectDashboardPath(projectId, title);
    const currentPath = location.pathname.split(/[?#]/)[0];
    if (currentPath === canonicalPath) return;

    navigate(canonicalPath, { replace: true });
  }, [
    projectId,
    activeProject?.projectId,
    activeProject?.title,
    projectNameFromPath,
    navigate,
    location.pathname,
  ]);

  // Ensure team/details are loaded for the current project.
  useEffect(() => {
    if (!activeProject?.projectId) return;
    const hasTeamArray = Array.isArray(activeProject.team);
    const hasDescription = typeof activeProject.description === "string";
    if (!hasTeamArray || !hasDescription) {
      fetchProjectDetails(activeProject.projectId);
    }
  }, [
    activeProject?.projectId,
    activeProject?.team,
    activeProject?.description,
    fetchProjectDetails,
  ]);

  // Subscribe this client to live updates for the active project's "conversation".
  useEffect(() => {
    if (!ws || !activeProject?.projectId) return;

    const payload = JSON.stringify({
      action: "setActiveConversation",
      conversationId: `project#${activeProject.projectId}`,
    });

    const onOpen = (): void => {
      try {
        ws.send(payload);
      } catch {
        /* no-op */
      }
    };

    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch {
        /* no-op */
      }
    } else {
      ws.addEventListener("open", onOpen);
    }

    return () => {
      ws.removeEventListener("open", onOpen);
    };
  }, [ws, activeProject?.projectId]);

  const calendarOverviewCard = (
    <CalendarOverviewCard
      project={activeProject as {
        projectId: string;
        title?: string;
        color?: string;
        dateCreated?: string;
        productionStart?: string;
        finishline?: string;
        timelineEvents?: Array<{
          id: string;
          eventId?: string;
          date: string;
          description?: string;
          hours?: number | string;
          budgetItemId?: string | null;
          createdAt?: string;
          payload?: Record<string, unknown>;
        }>;
        address?: string;
        company?: string;
        clientName?: string;
        invoiceBrandName?: string;
        invoiceBrandAddress?: string;
        clientAddress?: string;
        invoiceBrandPhone?: string;
        clientPhone?: string;
        clientEmail?: string;
      }}
      initialFlashDate={flashDate}
      showEventList={false}
      onWrapperClick={openCalendarPage}
      onDateSelect={noop}
    />
  );

  // Render
  return (
    <ProjectPageLayout
      projectId={activeProject?.projectId}
      theme={projectPalette}
      header={
        <ProjectHeader
          activeProject={activeProject}
          parseStatusToNumber={parseStatusToNumber}
          userId={userId}
          onProjectDeleted={handleProjectDeleted}
          showWelcomeScreen={showWelcome}
          onActiveProjectChange={handleActiveProjectChange}
          onOpenFiles={() => setFilesOpen(true)}
          onOpenQuickLinks={() => quickLinksRef.current?.openModal()}
          title={activeProject?.title}
        />
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          className="column-2"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <BudgetProvider projectId={activeProject?.projectId}>
            <div className="overview-layout">
              <QuickLinksComponent ref={quickLinksRef} hideTrigger />

            {FileManagerComponent && (
              <FileManagerComponent
                {...{
                  isOpen: filesOpen,
                  onRequestClose: () => setFilesOpen(false),
                  showTrigger: false,
                  folder: "uploads",
                }}
              />
            )}

              <div
                className={`dashboard-layout budget-calendar-layout${
                  isMobileBudgetLayout ? " budget-calendar-layout--stacked" : ""
                }`}
              >
                <div className="budget-column">
                  <BudgetOverviewCard projectId={activeProject?.projectId} />
                  {isMobileBudgetLayout && (
                    <div className="budget-calendar-mobile-card">{calendarOverviewCard}</div>
                  )}

                  <GalleryComponent />
                </div>
                {!isMobileBudgetLayout && <div className="calendar-column">{calendarOverviewCard}</div>}
              </div>

              {/* <Timeline
                activeProject={activeProject as Project & { status: string; milestoneTitles?: string[] }}
                parseStatusToNumber={parseStatusToNumber}
                onActiveProjectChange={handleActiveProjectChange}
              /> */}

              <div className="dashboard-layout timeline-location-row">
                <div className="location-wrapper">
                  <LocationComponent
                    activeProject={activeProject}
                    onActiveProjectChange={handleActiveProjectChange}
                  />
                </div>
                <div className="tasks-wrapper">
                  <TasksComponent
                    projectId={activeProject?.projectId}
                    userId={userId}
                    team={activeProject?.team}
                  />
                </div>
              </div>
            </div>
          </BudgetProvider>
        </motion.div>
      </AnimatePresence>
    </ProjectPageLayout>
  );
};

export default SingleProject;










