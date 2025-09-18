import { useCallback, useEffect, useMemo, useState } from "react";

import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { useData } from "@/app/contexts/useData";
import type { UserLite } from "@/app/contexts/DataProvider";
import { useProjectKpis, type ProjectLike } from "@/dashboard/dashboard/hooks/useProjectKpis";
import { MICRO_WOBBLE_SCALE, SPRING_FAST } from "@/shared/ui/motionTokens";

import desktopStyles from "./ProjectsPanelDesktop.module.css";
import mobileStyles from "@/dashboard/dashboard/components/projects-panel.module.css";
import { ProjectsIconsStrip } from "./ProjectsIconsStrip";
import ProjectsTable from "./ProjectsTable";
import { ProjectsFilterMenu } from "./ProjectsFilterMenu";
import { useProjectFilters } from "./hooks/useProjectFilters";
import type { ProjectWithMeta } from "../utils/types";

import "@/dashboard/dashboard/components/week-widget.css";

const DEFAULT_DESKTOP_ROWS = 6;

export type ProjectsPanelDesktopProps = {
  onOpenProject?: (projectId: string) => void;
};

const ProjectsPanelDesktop: React.FC<ProjectsPanelDesktopProps> = ({ onOpenProject }) => {
  const reduceMotion = useReducedMotion();
  const { projects = [], isLoading, projectsError, fetchProjects, allUsers } = useData() as {
    projects: ProjectLike[];
    isLoading: boolean;
    projectsError: boolean;
    fetchProjects: () => Promise<void> | void;
    allUsers: UserLite[];
  };
  const navigate = useNavigate();

  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isLoading && projects.length === 0 && !projectsError) {
      fetchProjects();
    }
  }, [isLoading, projects.length, projectsError, fetchProjects]);

  const handleImageError = useCallback((projectId: string) => {
    setImgError((prev) => {
      if (prev[projectId]) return prev;
      return { ...prev, [projectId]: true };
    });
  }, []);

  const handleOpen = useCallback(
    (projectId: string) => {
      if (onOpenProject) {
        onOpenProject(projectId);
      } else {
        navigate("/dashboard/projects");
      }
    },
    [onOpenProject, navigate]
  );

  const {
    filtersOpen,
    filtersRef,
    filtersId,
    toggleFilters,
    scope,
    setScope,
    query,
    setQuery,
    statusOptions,
    statusTriggerLabel,
    statusDropdown,
    showStatusDropdown,
    sortOptions,
    sortTriggerLabel,
    sortDropdown,
    filteredProjects,
  } = useProjectFilters({
    projects: projects as ProjectLike[],
    recentsLimit: DEFAULT_DESKTOP_ROWS,
  });

  const kpis = useProjectKpis(projects as ProjectLike[]);

  const usersById = useMemo(() => {
    const map = new Map<string, UserLite>();
    (Array.isArray(allUsers) ? allUsers : []).forEach((user: UserLite) => {
      if (user?.userId) map.set(user.userId, user);
    });
    return map;
  }, [allUsers]);

  return (
    <section
      aria-label="Projects overview"
      className={`${desktopStyles.card} week-widget week-widget--desktop`}
    >
      <header className={desktopStyles.header}>
        <div className={desktopStyles.headerTop}>
          <div className={mobileStyles.titleWrap}>
            <h3 className={mobileStyles.title}>Projects</h3>
            <ProjectsIconsStrip
              projects={projects as ProjectLike[]}
              imgError={imgError}
              onImageError={handleImageError}
              onOpenProject={handleOpen}
            />
          </div>
        </div>

        <ProjectsFilterMenu
          filtersOpen={filtersOpen}
          filtersRef={filtersRef}
          filtersId={filtersId}
          scope={scope}
          onScopeChange={setScope}
          query={query}
          onQueryChange={setQuery}
          toggleFilters={toggleFilters}
          statusOptions={statusOptions}
          statusTriggerLabel={statusTriggerLabel}
          statusDropdown={statusDropdown}
          showStatusDropdown={showStatusDropdown}
          sortOptions={sortOptions}
          sortTriggerLabel={sortTriggerLabel}
          sortDropdown={sortDropdown}
        />

        <div className={mobileStyles.kpis}>
          <motion.span
            className={mobileStyles.chip}
            whileHover={reduceMotion ? undefined : { scale: MICRO_WOBBLE_SCALE }}
            whileFocus={reduceMotion ? undefined : { scale: MICRO_WOBBLE_SCALE }}
            transition={reduceMotion ? undefined : SPRING_FAST}
          >
            {kpis.totalProjects} Projects
          </motion.span>
          <span className={mobileStyles.dot} />
          <motion.span
            className={mobileStyles.chip}
            whileHover={reduceMotion ? undefined : { scale: MICRO_WOBBLE_SCALE }}
            whileFocus={reduceMotion ? undefined : { scale: MICRO_WOBBLE_SCALE }}
            transition={reduceMotion ? undefined : SPRING_FAST}
          >
            {kpis.pendingProjects} Pending
          </motion.span>
          <span className={mobileStyles.dot} />
          <motion.span
            className={mobileStyles.chip}
            whileHover={reduceMotion ? undefined : { scale: MICRO_WOBBLE_SCALE }}
            whileFocus={reduceMotion ? undefined : { scale: MICRO_WOBBLE_SCALE }}
            transition={reduceMotion ? undefined : SPRING_FAST}
          >
            {kpis.nextProject
              ? `Next: ${kpis.nextProject.title} ${kpis.nextProject.date}`
              : "No upcoming projects"}
          </motion.span>
        </div>
      </header>

      <div className={desktopStyles.content}>
        <ProjectsTable
          projects={filteredProjects as ProjectWithMeta[]}
          isLoading={isLoading}
          projectsError={projectsError}
          onOpenProject={handleOpen}
          onImageError={handleImageError}
          imgError={imgError}
          usersById={usersById}
        />
      </div>

      <div className={desktopStyles.footer}>
        <button
          type="button"
          className={desktopStyles.footerButton}
          onClick={() => navigate("/dashboard/projects")}
        >
          See all projects
        </button>
      </div>
    </section>
  );
};

export default ProjectsPanelDesktop;

