import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ProjectHeader from "@/features/project/components/ProjectHeader";

import BudgetOverviewCard from "@/features/budget/components/BudgetOverviewCard";

import GalleryComponent from "@/features/project/components/GalleryComponent";

import ProjectPageLayout from "@/features/project/components/ProjectPageLayout";
import Timeline from "@/features/project/components/Timeline";
import ProjectCalendar from "@/features/project/components/ProjectCalendar";
import QuickLinksComponent from "@/features/project/components/QuickLinksComponent";
import LocationComponent from "@/features/project/components/LocationComponent";
import FileManagerComponent from "@/features/project/components/FileManager";
import TasksComponent from "@/features/project/components/TasksComponent";
import { BudgetProvider } from "@/features/budget/context/BudgetProvider";
import { useData } from "@/app/contexts/useData";
import { useSocket } from "@/app/contexts/useSocket";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { findProjectBySlug, slugify } from "@/shared/utils/slug";
import type { Project } from "@/app/contexts/DataProvider";

interface QuickLinksRef {
  openModal: () => void;
}

interface LocationState {
  flashDate?: string;
}

const SingleProject: React.FC = () => {
  const {
    activeProject,
    userId,
    projects,
    fetchProjectDetails,
    setProjects,
    setSelectedProjects,
  } = useData();

  const navigate = useNavigate();
  const location = useLocation();
  const flashDate = (location.state as LocationState)?.flashDate;

  const { projectSlug } = useParams<{ projectSlug: string }>();
  const [filesOpen, setFilesOpen] = useState<boolean>(false);
  const quickLinksRef = useRef<QuickLinksRef>(null);
  const { ws } = useSocket();

  // Stable helpers
  const noop = useCallback(() => {}, []);

  const currentSlug = useMemo(
    () => (activeProject?.title ? slugify(activeProject.title) : null),
    [activeProject?.title]
  );

  const parseStatusToNumber = useCallback((status: unknown): number => {
    if (status === undefined || status === null) return 0;
    const str = typeof status === "string" ? status : String(status);
    const num = parseFloat(str.replace("%", ""));
    return Number.isNaN(num) ? 0 : num;
  }, []);

  const showWelcome = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  const openCalendarPage = useCallback(() => {
    if (!activeProject) return;
    const slug = slugify(activeProject.title);
    navigate(`/dashboard/projects/${slug}/calendar`);
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

  // Keep URL and active project in sync with the slug the user visited.
  useEffect(() => {
    if (!projectSlug) return;

    // If we're already viewing the right project, nothing to do.
    if (currentSlug === projectSlug) return;

    // Try to locate the project by slug and load it if it's different from the active one.
    const proj = findProjectBySlug(projects, projectSlug);
    if (proj && proj.projectId !== activeProject?.projectId) {
      fetchProjectDetails(proj.projectId as string);
    }
  }, [
    projectSlug,
    currentSlug,
    projects,
    fetchProjectDetails,
    activeProject?.projectId,
  ]);

  // Ensure team/details are loaded for the current project.
  useEffect(() => {
    if (!activeProject?.projectId) return;
    const hasTeamArray = Array.isArray(activeProject.team);
    if (!hasTeamArray) {
      fetchProjectDetails(activeProject.projectId);
    }
  }, [activeProject?.projectId, activeProject?.team, fetchProjectDetails]);

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

  // Render
  return (
    <ProjectPageLayout
      projectId={activeProject?.projectId}
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

              <div className="dashboard-layout budget-calendar-layout">
                <div className="budget-column">
                  <BudgetOverviewCard projectId={activeProject?.projectId} />

                  <GalleryComponent />
                </div>
                <div className="calendar-column">
                  <ProjectCalendar
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
                </div>
              </div>

              <Timeline
                activeProject={activeProject as Project & { status: string; milestoneTitles?: string[] }}
                parseStatusToNumber={parseStatusToNumber}
                onActiveProjectChange={handleActiveProjectChange}
              />

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
