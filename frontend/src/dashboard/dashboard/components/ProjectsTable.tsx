import type { FC, KeyboardEvent as ReactKeyboardEvent } from "react";

import desktopStyles from "./ProjectsPanelDesktop.module.css";
import mobileStyles from "@/dashboard/dashboard/components/projects-panel.module.css";
import SVGThumbnail from "@/dashboard/dashboard/components/SvgThumbnail";
import { getFileUrl } from "@/shared/utils/api";
import type { UserLite } from "@/app/contexts/DataProvider";
import type { ProjectWithMeta } from "../utils/types";
import { formatShortDate } from "../utils/utils";

type ProjectsTableProps = {
  projects: ProjectWithMeta[];
  isLoading: boolean;
  projectsError: boolean;
  onOpenProject: (projectId: string) => void;
  onImageError: (projectId: string) => void;
  imgError: Record<string, boolean>;
  usersById: Map<string, UserLite>;
};

const getOwnerName = (project: ProjectWithMeta, usersById: Map<string, UserLite>): string => {
  const team = Array.isArray(project.team) ? project.team : [];
  if (team.length === 0) return "—";
  const primary = team[0];
  const user = primary?.userId ? usersById.get(primary.userId) : undefined;
  const first = user?.firstName ?? primary?.firstName ?? "";
  const last = user?.lastName ?? primary?.lastName ?? "";
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return user?.email || user?.username || primary?.email || primary?.userId || "—";
};

const ProjectsTable: FC<ProjectsTableProps> = ({
  projects,
  isLoading,
  projectsError,
  onOpenProject,
  onImageError,
  imgError,
  usersById,
}) => {
  const handleRowKeyDown = (
    event: ReactKeyboardEvent<HTMLTableRowElement>,
    projectId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenProject(projectId);
    }
  };

  const errorText = projectsError ? "Failed to load projects." : undefined;

  if (errorText) {
    return <div className={desktopStyles.errorState}>{errorText}</div>;
  }

  return (
    <div className={desktopStyles.tableWrap}>
      {isLoading ? (
        <div className={desktopStyles.emptyState}>Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className={desktopStyles.emptyState}>No projects match filters.</div>
      ) : (
        <table className={desktopStyles.table} aria-label="Projects table">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Status</th>
              <th scope="col">Deadline</th>
              <th scope="col">Owner</th>
              <th scope="col">Unread</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const id = project.projectId;
              const title = (project.title || "Untitled project").trim();
              const thumb =
                Array.isArray(project.thumbnails) && project.thumbnails[0]
                  ? project.thumbnails[0]
                  : undefined;
              const deadline = formatShortDate(project.finishline);
              const status = project.status ? String(project.status) : "—";
              const unread = Number.isFinite(project.unreadCount as number)
                ? Number(project.unreadCount)
                : Number((project as { unreadCount?: number }).unreadCount ?? 0);
              const owner = getOwnerName(project, usersById);

              return (
                <tr
                  key={id}
                  tabIndex={0}
                  onClick={() => onOpenProject(id)}
                  onKeyDown={(event) => handleRowKeyDown(event, id)}
                  aria-label={`Open project ${title}`}
                >
                  <td>
                    <div className={desktopStyles.projectCell}>
                      <span className={desktopStyles.thumb} aria-hidden>
                        {thumb && !imgError[id] ? (
                          <img
                            className={mobileStyles.thumb}
                            src={getFileUrl(thumb)}
                            alt=""
                            onError={() => onImageError(id)}
                          />
                        ) : (
                          <SVGThumbnail
                            initial={title.charAt(0).toUpperCase() || "#"}
                            className={mobileStyles.thumb}
                          />
                        )}
                      </span>
                      <span className={desktopStyles.projectName}>{title}</span>
                    </div>
                  </td>
                  <td>
                    <span className={desktopStyles.statusBadge}>{status}</span>
                  </td>
                  <td>
                    <span className={desktopStyles.deadline}>{deadline ?? "—"}</span>
                  </td>
                  <td>
                    <span className={desktopStyles.owner}>{owner}</span>
                  </td>
                  <td>
                    <span className={desktopStyles.unreadPill}>{unread}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProjectsTable;




