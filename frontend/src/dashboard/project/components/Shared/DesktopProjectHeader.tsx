import type { KeyboardEvent } from "react";

import { Folder, Link2, Settings } from "lucide-react";

import AvatarStack from "@/shared/ui/AvatarStack";
import Squircle from "@/shared/ui/Squircle";

import type { Project } from "@/app/contexts/DataProvider";

import ProjectTabs from "./ProjectTabs";
import type { TeamMember } from "./types";
import type { ProjectTabItem } from "./useProjectTabs";

interface NavigationProps {
  tabs: ProjectTabItem[];
  activeIndex: number;
  storageKey: string;
  getFromIndex: () => number;
  confirmNavigate: (path: string) => void;
}

interface DesktopProjectHeaderProps {
  project: Project;
  projectInitial: string;
  displayStatus: string;
  progressValue: number;
  rangeLabel: string;
  handleKeyDown: (event: KeyboardEvent, action: () => void) => void;
  onOpenStatus: () => void;
  onOpenFinishLine: () => void;
  onOpenSettings: () => void;
  onOpenQuickLinks: () => void;
  onOpenFiles: () => void;
  onOpenThumbnail: () => void;
  onOpenTeam: () => void;
  teamMembers: TeamMember[];
  navigation: NavigationProps;
  getFileUrlForThumbnail: (thumbnail: string) => string;
}

const DesktopProjectHeader = ({
  project,
  projectInitial,
  displayStatus,
  progressValue,
  rangeLabel,
  handleKeyDown,
  onOpenStatus,
  onOpenFinishLine,
  onOpenSettings,
  onOpenQuickLinks,
  onOpenFiles,
  onOpenThumbnail,
  onOpenTeam,
  teamMembers,
  navigation,
  getFileUrlForThumbnail,
}: DesktopProjectHeaderProps) => {
  const thumbnailKey = project?.thumbnails?.[0] as string | undefined;
  const projectTitle = project?.title || "Summary";
  const progressPercentage = Number.isFinite(progressValue)
    ? Math.min(Math.max(progressValue, 0), 100)
    : 0;
  const completeLabel = `${Math.round(progressPercentage)}% Complete`;

  return (
    <header className="desktop-project-header">
      <div className="desktop-project-header__inner">
        <div className="desktop-project-header__top">
          <div className="desktop-project-header__identity">
            <div className="project-logo-wrapper">
              <Squircle
                as="button"
                type="button"
                onClick={onOpenThumbnail}
                title="Change Project Thumbnail"
                aria-label="Change Project Thumbnail"
                className="interactive project-logo-button desktop-project-header__logo-button"
                radius={18}
                smoothing={0.88}
              >
                {thumbnailKey ? (
                  <img
                    src={getFileUrlForThumbnail(thumbnailKey)}
                    alt="Project Thumbnail"
                    className="project-logo-image"
                  />
                ) : (
                  <span className="project-logo-initial">{projectInitial.toUpperCase()}</span>
                )}
              </Squircle>
            </div>

            <div className="desktop-project-header__identity-text">
              <div className="desktop-project-header__title-row">
                <h2 className="desktop-project-header__title">{projectTitle}</h2>
                <button
                  type="button"
                  className="desktop-project-header__status-badge interactive"
                  onClick={onOpenStatus}
                  onKeyDown={(event) => handleKeyDown(event, onOpenStatus)}
                  aria-label={`Update status (${displayStatus})`}
                >
                  {displayStatus}
                </button>
              </div>

              <button
                type="button"
                className="desktop-project-header__range interactive"
                onClick={onOpenFinishLine}
                onKeyDown={(event) => handleKeyDown(event, onOpenFinishLine)}
                aria-label="Edit production dates"
              >
                {rangeLabel}
              </button>
            </div>
          </div>

          <div className="desktop-project-header__meta">
            <div className="desktop-project-header__progress" aria-live="polite">
              <div className="desktop-project-header__progress-bar" aria-hidden="true">
                <div
                  className="desktop-project-header__progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="desktop-project-header__progress-label">{completeLabel}</span>
            </div>

            <div className="desktop-project-header__team">
              <AvatarStack members={teamMembers} onClick={onOpenTeam} />
            </div>

            <div className="desktop-project-header__icon-buttons">
              <button
                type="button"
                className="desktop-project-header__icon-button interactive"
                onClick={onOpenSettings}
                onKeyDown={(event) => handleKeyDown(event, onOpenSettings)}
                aria-label="Project settings"
              >
                <Settings size={18} />
              </button>
              <button
                type="button"
                className="desktop-project-header__icon-button interactive"
                onClick={onOpenQuickLinks}
                onKeyDown={(event) => handleKeyDown(event, onOpenQuickLinks)}
                aria-label="Quick links"
              >
                <Link2 size={18} />
              </button>
              <button
                type="button"
                className="desktop-project-header__icon-button interactive"
                onClick={onOpenFiles}
                onKeyDown={(event) => handleKeyDown(event, onOpenFiles)}
                aria-label="Open file manager"
              >
                <Folder size={18} />
              </button>
            </div>
          </div>
        </div>

        <nav className="desktop-project-header__nav" aria-label="Project navigation">
          <div className="project-nav-tabs">
            <ProjectTabs
              tabs={navigation.tabs}
              activeIndex={navigation.activeIndex}
              getFromIndex={navigation.getFromIndex}
              storageKey={navigation.storageKey}
              confirmNavigate={navigation.confirmNavigate}
            />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default DesktopProjectHeader;
