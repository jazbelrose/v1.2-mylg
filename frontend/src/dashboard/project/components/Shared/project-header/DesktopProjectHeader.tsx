import React from "react";

import { Folder, Link2, Settings } from "lucide-react";

import AvatarStack from "@/shared/ui/AvatarStack";
import Squircle from "@/shared/ui/Squircle";
import { getFileUrl } from "@/shared/utils/api";

import ProjectTabs from "./ProjectTabs";
import type { Project } from "@/app/contexts/DataProvider";
import type { TeamMember } from "../types";

interface DesktopProjectHeaderProps {
  project: Project | null;
  projectId: string;
  projectInitial: string;
  displayStatus: string;
  parseStatusToNumber: (status: string | number | undefined) => number;
  rangeLabel: string;
  teamMembers: TeamMember[];
  onOpenThumbnail: () => void;
  onOpenStatus: () => void;
  onOpenTeam: () => void;
  onOpenFinishLine: () => void;
  onOpenSettings: () => void;
  onOpenQuickLinks: () => void;
  onOpenFiles: () => void;
  onKeyDown: (event: React.KeyboardEvent, action: () => void) => void;
}

const DesktopProjectHeader: React.FC<DesktopProjectHeaderProps> = ({
  project,
  projectId,
  projectInitial,
  displayStatus,
  parseStatusToNumber,
  rangeLabel,
  teamMembers,
  onOpenThumbnail,
  onOpenStatus,
  onOpenTeam,
  onOpenFinishLine,
  onOpenSettings,
  onOpenQuickLinks,
  onOpenFiles,
  onKeyDown,
}) => {
  return (
    <div className="project-header">
      <div className="header-content">
        <div className="left-side">
          <div className="project-logo-wrapper">
            <Squircle
              as="button"
              type="button"
              onClick={onOpenThumbnail}
              title="Change Project Thumbnail"
              aria-label="Change Project Thumbnail"
              className="interactive project-logo-button"
              radius={18}
              smoothing={0.88}
            >
              {project?.thumbnails && project.thumbnails.length > 0 ? (
                <img
                  src={getFileUrl(project.thumbnails[0])}
                  alt="Project Thumbnail"
                  className="project-logo-image"
                />
              ) : (
                <span className="project-logo-initial">{projectInitial.toUpperCase()}</span>
              )}
            </Squircle>
          </div>

          <div className="single-project-title">
            <h2 className="project-title-heading">{project ? project.title : "Summary"}</h2>
          </div>

          <svg
            id="StatusSVG"
            viewBox="0 0 400 400"
            onClick={onOpenStatus}
            onKeyDown={(event) => onKeyDown(event, onOpenStatus)}
            role="button"
            tabIndex={0}
            aria-label={`Status: ${displayStatus} Complete`}
            className="interactive status-svg"
            style={{ cursor: "pointer" }}
          >
            <title>{`Status: ${displayStatus} Complete`}</title>
            <text
              className="project-status"
              transform={`translate(${project?.status !== "100%" ? 75 : 56.58} 375.21)`}
            >
              <tspan x="22.5" y="-136">
                {displayStatus}
              </tspan>
            </text>
            {project && (
              <ellipse
                cx="200"
                cy="200"
                rx="160"
                ry="160"
                fill="none"
                strokeWidth="15"
                strokeDasharray={`${(parseStatusToNumber(project.status) / 100) * 1002}, 1004`}
                style={{
                  stroke: "var(--progress-accent, var(--accent-strong, #FA3356))",
                }}
              >
                {parseStatusToNumber(project.status) < 100 && (
                  <animate
                    attributeName="stroke-dasharray"
                    from="0, 1004"
                    to={`${(parseStatusToNumber(project.status) / 100) * 1002}, 1004`}
                    dur="1s"
                    begin="0s"
                    fill="freeze"
                  />
                )}
              </ellipse>
            )}
          </svg>

          <AvatarStack members={teamMembers} onClick={onOpenTeam} />

          <div
            className="finish-line-header interactive"
            onClick={onOpenFinishLine}
            onKeyDown={(event) => onKeyDown(event, onOpenFinishLine)}
            role="button"
            tabIndex={0}
            title="Production dates"
            aria-label="Production dates"
            style={{ cursor: "pointer" }}
          >
            <span>{rangeLabel}</span>
          </div>

          <div
            onClick={onOpenSettings}
            onKeyDown={(event) => onKeyDown(event, onOpenSettings)}
            role="button"
            tabIndex={0}
            title="Project settings"
            aria-label="Project settings"
            className="interactive"
            style={{ cursor: "pointer", margin: "10px" }}
          >
            <Settings size={20} className="settings-icon" />
          </div>

          <div
            onClick={onOpenQuickLinks}
            onKeyDown={(event) => onKeyDown(event, onOpenQuickLinks)}
            role="button"
            tabIndex={0}
            title="Quick links"
            aria-label="Quick links"
            className="interactive"
            style={{ cursor: "pointer" }}
          >
            <Link2 size={20} />
          </div>

          <div
            onClick={onOpenFiles}
            onKeyDown={(event) => onKeyDown(event, onOpenFiles)}
            role="button"
            tabIndex={0}
            title="Open file manager"
            aria-label="Open file manager"
            className="interactive"
            style={{ cursor: "pointer", margin: "10px" }}
          >
            <Folder size={20} />
          </div>
        </div>

        <div className="right-side">
          <div className="project-nav-tabs" style={{ padding: "0 10px 10px" }}>
            <ProjectTabs projectId={project?.projectId || projectId} projectTitle={project?.title} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopProjectHeader;
