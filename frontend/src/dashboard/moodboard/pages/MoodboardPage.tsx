import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProjectPageLayout from "@/dashboard/project/components/ProjectPageLayout";
import ProjectHeader from "@/dashboard/project/components/ProjectHeader";
import MoodboardCanvas from "../components/MoodboardCanvas";
import { useData } from "@/app/contexts/useData";
import { findProjectBySlug, slugify } from "@/shared/utils/slug";
import type { Project } from "@/app/contexts/DataProvider";
import { useProjectPalette } from "@/dashboard/project/hooks/useProjectPalette";
import { resolveProjectCoverUrl } from "@/dashboard/project/utils/theme";

const MoodboardPage: React.FC = () => {
  const { projectSlug = "" } = useParams<{ projectSlug: string }>();
  const navigate = useNavigate();
  const {
    activeProject: initialProject,
    projects,
    fetchProjectDetails,
    setProjects,
    setSelectedProjects,
    userId,
  } = useData();

  const [activeProject, setActiveProject] = useState<Project | null>(initialProject ?? null);

  const coverImage = useMemo(() => resolveProjectCoverUrl(activeProject), [activeProject]);
  const projectPalette = useProjectPalette(coverImage);

  useEffect(() => {
    setActiveProject(initialProject ?? null);
  }, [initialProject]);

  useEffect(() => {
    if (!projectSlug) return;
    const matchesSlug =
      activeProject?.title && slugify(activeProject.title) === projectSlug;
    if (matchesSlug) return;
    const fromList = findProjectBySlug(projects, projectSlug);
    if (fromList && fromList.projectId) {
      void fetchProjectDetails(fromList.projectId);
    } else if (initialProject?.title) {
      navigate(`/dashboard/projects/${slugify(initialProject.title)}/moodboard`, {
        replace: true,
      });
    } else {
      navigate("/dashboard/projects");
    }
  }, [
    activeProject?.title,
    fetchProjectDetails,
    initialProject?.title,
    navigate,
    projectSlug,
    projects,
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

  const projectId = activeProject?.projectId ?? "";
  const currentUserId = userId ?? "";

  const board = useMemo(
    () => (
      <AnimatePresence mode="wait">
        <motion.div
          key={projectId || "moodboard"}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.25 }}
        >
          <MoodboardCanvas
            projectId={projectId}
            userId={currentUserId}
            palette={projectPalette}
          />
        </motion.div>
      </AnimatePresence>
    ),
    [currentUserId, projectId, projectPalette]
  );

  return (
    <ProjectPageLayout
      projectId={projectId}
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

