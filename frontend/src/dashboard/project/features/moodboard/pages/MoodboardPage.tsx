import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProjectPageLayout from "@/dashboard/project/components/Shared/ProjectPageLayout";
import ProjectHeader from "@/dashboard/project/components/Shared/ProjectHeader";
import MoodboardCanvas from "../components/MoodboardCanvas";
import { useData } from "@/app/contexts/useData";
import { getProjectDashboardPath } from "@/shared/utils/projectUrl";
import type { Project } from "@/app/contexts/DataProvider";
import { useProjectPalette } from "@/dashboard/project/hooks/useProjectPalette";
import { resolveProjectCoverUrl } from "@/dashboard/project/utils/theme";

const MoodboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeProject: initialProject,
    fetchProjectDetails,
    setProjects,
    setSelectedProjects,
    userId,
  } = useData();

  const [activeProject, setActiveProject] = useState<Project | null>(initialProject ?? null);

  const coverImage = useMemo(() => resolveProjectCoverUrl(activeProject), [activeProject]);
  const projectPalette = useProjectPalette(coverImage, {
    color: activeProject?.color,
  });

  useEffect(() => {
    setActiveProject(initialProject ?? null);
  }, [initialProject]);

  useEffect(() => {
    if (!projectId) return;
    if (!initialProject || initialProject.projectId !== projectId) {
      void fetchProjectDetails(projectId);
    }
  }, [projectId, initialProject, fetchProjectDetails]);

  useEffect(() => {
    if (!projectId) return;
    const title = activeProject?.title ?? initialProject?.title;
    if (!title) return;

    const currentPath = location.pathname.split(/[?#]/)[0];
    if (!currentPath.includes("/moodboard")) return;

    const canonicalPath = getProjectDashboardPath(projectId, title, "/moodboard");
    if (currentPath === canonicalPath) return;

    navigate(canonicalPath, { replace: true });
  }, [
    projectId,
    activeProject?.title,
    initialProject?.title,
    location.pathname,
    navigate,
  ]);

  useEffect(() => {
    if (!activeProject?.projectId) return;
    void fetchProjectDetails(activeProject.projectId);
  }, [activeProject?.projectId, fetchProjectDetails]);

  const parseStatusToNumber = useCallback((status: string | number | undefined | null) => {
    if (status === undefined || status === null) return 0;
    const str = typeof status === "string" ? status : String(status);
    const num = parseFloat(str.replace("%", ""));
    return Number.isNaN(num) ? 0 : num;
  }, []);

  const handleProjectDeleted = useCallback(
    (projectId: string) => {
      setProjects((prev) => prev.filter((item) => item.projectId !== projectId));
      setSelectedProjects((prev) => prev.filter((id) => id !== projectId));
      navigate("/dashboard/projects");
    },
    [navigate, setProjects, setSelectedProjects]
  );

  const handleActiveProjectChange = useCallback((project: Project) => {
    setActiveProject(project);
  }, []);

  const showWelcomeScreen = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  const resolvedProjectId = activeProject?.projectId ?? "";
  const currentUserId = userId ?? "";

  const board = useMemo(
    () => (
      <AnimatePresence mode="wait">
        <motion.div
          key={resolvedProjectId || "moodboard"}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.25 }}
          style={{ height: "100%" }}
        >
          <MoodboardCanvas
            projectId={resolvedProjectId}
            userId={currentUserId}
            palette={projectPalette}
          />
        </motion.div>
      </AnimatePresence>
    ),
    [currentUserId, resolvedProjectId, projectPalette]
  );

  return (
    <ProjectPageLayout
      projectId={resolvedProjectId}
      theme={projectPalette}
      header={
        <ProjectHeader
          parseStatusToNumber={parseStatusToNumber}
          userId={currentUserId}
          onProjectDeleted={handleProjectDeleted}
          activeProject={activeProject}
          showWelcomeScreen={showWelcomeScreen}
          onActiveProjectChange={handleActiveProjectChange}
          onOpenFiles={() => {}}
          onOpenQuickLinks={() => {}}
        />
      }
    >
      {board}
    </ProjectPageLayout>
  );
};

export default MoodboardPage;












