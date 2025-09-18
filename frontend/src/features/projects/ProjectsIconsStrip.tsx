import type { FC } from "react";

import type { ProjectLike } from "@/features/dashboard/hooks/useProjectKpis";
import SVGThumbnail from "@/features/dashboard/components/SvgThumbnail";
import { getFileUrl } from "@/shared/utils/api";

import mobileStyles from "@/features/dashboard/components/projects-panel.module.css";

type ProjectsIconsStripProps = {
  projects: ProjectLike[];
  imgError: Record<string, boolean>;
  onImageError: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
};

const MAX_ICONS = 7;

export const ProjectsIconsStrip: FC<ProjectsIconsStripProps> = ({
  projects,
  imgError,
  onImageError,
  onOpenProject,
}) => {
  const shown = projects.slice(0, MAX_ICONS);
  const more = Math.max(0, projects.length - shown.length);

  return (
    <div className={mobileStyles.iconsStrip} aria-label="Quick projects">
      {shown.map((project) => {
        const id = project.projectId;
        const title = (project.title || "Untitled project").trim();
        const thumb =
          Array.isArray(project.thumbnails) && project.thumbnails[0]
            ? project.thumbnails[0]
            : undefined;

        return (
          <button
            key={`icon-${id}`}
            type="button"
            className={mobileStyles.iconBtnSm}
            aria-label={`Open project ${title}`}
            title={title}
            onClick={() => onOpenProject(id)}
          >
            {thumb && !imgError[id] ? (
              <img
                className={mobileStyles.thumbSm}
                src={getFileUrl(thumb)}
                alt=""
                onError={() => onImageError(id)}
              />
            ) : (
              <SVGThumbnail
                initial={title.charAt(0).toUpperCase() || "#"}
                className={mobileStyles.thumbSm}
              />
            )}
          </button>
        );
      })}
      {more > 0 && (
        <span className={mobileStyles.iconsMore} aria-hidden>
          +{more}
        </span>
      )}
    </div>
  );
};
