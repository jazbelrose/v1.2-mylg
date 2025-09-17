import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useData } from "@/app/contexts/useData";
import type { UserLite } from "@/app/contexts/DataProvider";
import { useProjectKpis, type ProjectLike } from "@/features/dashboard/hooks/useProjectKpis";
import SVGThumbnail from "@/features/dashboard/components/SvgThumbnail";
import { Kebab } from "@/shared/icons/Kebab";
import { getFileUrl } from "@/shared/utils/api";
import desktopStyles from "./ProjectsPanelDesktop.module.css";
import mobileStyles from "@/features/dashboard/components/projects-panel.module.css";
import { MICRO_WOBBLE_SCALE, SPRING_FAST } from "@/shared/ui/motionTokens";

import "@/features/dashboard/components/week-widget.css";

const DEFAULT_DESKTOP_ROWS = 6;

export type ProjectsPanelDesktopProps = {
  onOpenProject?: (projectId: string) => void;
};

type SortOption = "titleAsc" | "titleDesc" | "dateNewest" | "dateOldest";

type ProjectWithMeta = ProjectLike & {
  _activity: number;
  _created: number;
  team?: Array<{ userId?: string; firstName?: string; lastName?: string; email?: string }>;
  unreadCount?: number;
};

const formatShortDate = (iso?: string): string | undefined => {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleString(undefined, { month: "short", day: "numeric" });
};

const getProjectActivityTs = (p: ProjectLike): number => {
  const candidates: (string | undefined)[] = [
    p.updatedAt,
    p.dateUpdated,
    p.lastModified,
    p.date,
    p.dateCreated,
  ];
  if (Array.isArray(p.timelineEvents)) {
    for (const ev of p.timelineEvents) {
      if (ev?.timestamp) candidates.push(ev.timestamp);
      if (ev?.date) candidates.push(ev.date);
    }
  }
  const timestamps = candidates
    .filter(Boolean)
    .map((s) => new Date(s as string).getTime())
    .filter((n) => Number.isFinite(n));
  return timestamps.length ? Math.max(...timestamps) : 0;
};

function sanitizeId(raw: string) {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

const ProjectsPanelDesktop: React.FC<ProjectsPanelDesktopProps> = ({ onOpenProject }) => {
  const reduceMotion = useReducedMotion();
  const {
    projects = [],
    isLoading,
    projectsError,
    fetchProjects,
    allUsers,
  } = useData() as {
    projects: ProjectLike[];
    isLoading: boolean;
    projectsError: boolean;
    fetchProjects: () => Promise<void> | void;
    allUsers: UserLite[];
  };
  const navigate = useNavigate();

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);
  const filtersIdRef = useRef(`projects-filters-${sanitizeId(Math.random().toString(36).slice(2))}`);

  const [sortOption, setSortOption] = useState<SortOption>("dateNewest");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [scope, setScope] = useState<"recents" | "all">("recents");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  useEffect(() => {
    if (!isLoading && projects.length === 0 && !projectsError) {
      fetchProjects();
    }
  }, [isLoading, projects.length, projectsError, fetchProjects]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuOpenId) return;
      const el = menuRefs.current[menuOpenId];
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpenId]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!filtersOpen) return;
      if (
        filtersRef.current &&
        e.target instanceof Node &&
        !filtersRef.current.contains(e.target)
      ) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [filtersOpen]);

  const statuses = useMemo(() => {
    try {
      return Array.from(
        new Set(
          projects
            .map((p) => String(p.status || "").toLowerCase())
            .filter(Boolean)
        )
      );
    } catch {
      return [] as string[];
    }
  }, [projects]);

  const items = useMemo(() => {
    const list: ProjectWithMeta[] = (projects as ProjectLike[]).map((p) => ({
      ...(p as ProjectWithMeta),
      _activity: getProjectActivityTs(p),
      _created: new Date(p.dateCreated || p.date || 0).getTime() || 0,
    }));

    let ordered = list.slice();
    if (scope === "recents") {
      ordered.sort((a, b) => b._activity - a._activity);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      ordered = ordered.filter((p) => (p.title || "").toLowerCase().includes(q));
    }
    if (statusFilter) {
      ordered = ordered.filter(
        (p) => String(p.status || "").toLowerCase() === statusFilter
      );
    }

    const byTitle = (a: ProjectLike, b: ProjectLike) =>
      (a.title || "").localeCompare(b.title || "", undefined, {
        sensitivity: "base",
      });
    const byCreated = (a: ProjectWithMeta, b: ProjectWithMeta) => b._created - a._created;
    const byCreatedAsc = (a: ProjectWithMeta, b: ProjectWithMeta) => a._created - b._created;

    switch (sortOption) {
      case "titleAsc":
        ordered.sort(byTitle);
        break;
      case "titleDesc":
        ordered.sort((a, b) => -byTitle(a, b));
        break;
      case "dateOldest":
        ordered.sort(byCreatedAsc);
        break;
      case "dateNewest":
      default:
        ordered.sort(byCreated);
        break;
    }

    if (scope === "recents") {
      return ordered.slice(0, DEFAULT_DESKTOP_ROWS);
    }
    return ordered;
  }, [projects, scope, query, statusFilter, sortOption]);

  const kpis = useProjectKpis(projects as ProjectLike[]);

  const usersById = useMemo(() => {
    const map = new Map<string, UserLite>();
    (Array.isArray(allUsers) ? allUsers : []).forEach((u: UserLite) => {
      if (u?.userId) map.set(u.userId, u);
    });
    return map;
  }, [allUsers]);

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

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen(id);
    }
  };

  const toggleMenu = (id: string) =>
    setMenuOpenId((prev) => (prev === id ? null : id));

  const onAction = (
    action: "open" | "pin" | "unpin" | "archive",
    id: string
  ) => {
    if (action === "open") {
      handleOpen(id);
    }
    console.log(`Project ${id}: ${action}`);
    setMenuOpenId(null);
  };

  const getOwnerName = (project: ProjectWithMeta): string => {
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

  const renderIconsStrip = () => {
    const allProjects = projects as ProjectLike[];
    const maxIcons = 7;
    const shown = allProjects.slice(0, maxIcons);
    const more = Math.max(0, allProjects.length - shown.length);

    return (
      <div className={mobileStyles.iconsStrip} aria-label="Quick projects">
        {shown.map((p) => {
          const id = p.projectId;
          const title = (p.title || "Untitled project").trim();
          const thumb = Array.isArray(p.thumbnails) && p.thumbnails[0] ? p.thumbnails[0] : undefined;
          return (
            <button
              key={`icon-${id}`}
              type="button"
              className={mobileStyles.iconBtnSm}
              aria-label={`Open project ${title}`}
              title={title}
              onClick={() => handleOpen(id)}
            >
              {thumb && !imgError[id] ? (
                <img
                  className={mobileStyles.thumbSm}
                  src={getFileUrl(thumb)}
                  alt=""
                  onError={() => setImgError((m) => ({ ...m, [id]: true }))}
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

  const tableRows = items.map((p) => {
    const id = p.projectId;
    const title = (p.title || "Untitled project").trim();
    const thumb = Array.isArray(p.thumbnails) && p.thumbnails[0] ? p.thumbnails[0] : undefined;
    const deadline = formatShortDate(p.finishline);
    const status = p.status ? String(p.status) : "—";
    const unread = Number.isFinite(p.unreadCount as number) ? Number(p.unreadCount) : Number((p as { unreadCount?: number }).unreadCount ?? 0);
    const owner = getOwnerName(p);

    return (
      <tr
        key={id}
        tabIndex={0}
        onClick={() => handleOpen(id)}
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
                  onError={() => setImgError((m) => ({ ...m, [id]: true }))}
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
  });

  const renderGrid = () => (
    <div className={desktopStyles.gridWrap}>
      <div
        className={`${mobileStyles.list} ${
          scope === "all" ? mobileStyles.listScrollable : ""
        }`}
        role="list"
      >
        {items.map((p) => {
          const dateIso =
            p.updatedAt || p.dateUpdated || p.lastModified || p.date || p.dateCreated;
          const dateLabel = formatShortDate(dateIso);
          const id = p.projectId;
          const title = (p.title || "Untitled project").trim();
          const isMenuOpen = menuOpenId === id;
          const thumb = Array.isArray(p.thumbnails) && p.thumbnails[0] ? p.thumbnails[0] : undefined;
          const onKey = (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpen(id);
            }
          };
          return (
            <div key={id} className={mobileStyles.row} role="listitem">
              <div
                className={mobileStyles.rowMain}
                role="button"
                tabIndex={0}
                onClick={() => handleOpen(id)}
                onKeyDown={onKey}
                aria-label={`Open project ${title}`}
              >
                <div className={mobileStyles.icon} aria-hidden>
                  {thumb && !imgError[id] ? (
                    <img
                      className={mobileStyles.thumb}
                      src={getFileUrl(thumb)}
                      alt=""
                      onError={() => setImgError((m) => ({ ...m, [id]: true }))}
                    />
                  ) : (
                    <SVGThumbnail
                      initial={title.charAt(0).toUpperCase() || "#"}
                      className={mobileStyles.thumb}
                    />
                  )}
                </div>
                <div className={mobileStyles.meta}>
                  <div className={mobileStyles.titleRow}>
                    <div className={mobileStyles.titleLeft}>
                      <span className={mobileStyles.name}>{title}</span>
                    </div>
                    {dateLabel ? (
                      <span className={mobileStyles.dateInline}>{dateLabel}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div
                className={`${mobileStyles.menu} ${
                  isMenuOpen ? mobileStyles.menuOpen : ""
                }`}
                ref={(el) => {
                  menuRefs.current[id] = el;
                }}
              >
                <button
                  type="button"
                  className={mobileStyles.menuBtn}
                  aria-label="Project actions"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  onClick={() => toggleMenu(id)}
                >
                  <Kebab size={20} aria-hidden />
                </button>
                {isMenuOpen && (
                  <div className={mobileStyles.menuPop} role="menu">
                    <button
                      className={mobileStyles.menuItem}
                      role="menuitem"
                      onClick={() => onAction("open", id)}
                    >
                      Open
                    </button>
                    <button
                      className={mobileStyles.menuItem}
                      role="menuitem"
                      onClick={() => onAction("pin", id)}
                    >
                      Pin
                    </button>
                    <button
                      className={mobileStyles.menuItem}
                      role="menuitem"
                      onClick={() => onAction("archive", id)}
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const errorText = projectsError ? "Failed to load projects." : undefined;

  let bodyContent: React.ReactNode;

  if (errorText) {
    bodyContent = <div className={desktopStyles.errorState}>{errorText}</div>;
  } else if (viewMode === "table") {
    bodyContent = (
      <div className={desktopStyles.tableWrap}>
        {isLoading ? (
          <div className={desktopStyles.emptyState}>Loading projects…</div>
        ) : items.length === 0 ? (
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
            <tbody>{tableRows}</tbody>
          </table>
        )}
      </div>
    );
  } else {
    bodyContent = isLoading ? (
      <div className={desktopStyles.emptyState}>Loading projects…</div>
    ) : items.length === 0 ? (
      <div className={desktopStyles.emptyState}>No projects match filters.</div>
    ) : (
      renderGrid()
    );
  }

  return (
    <section
      aria-label="Projects overview"
      className={`${desktopStyles.card} week-widget week-widget--desktop`}
    >
      <header className={desktopStyles.header}>
        <div className={desktopStyles.headerTop}>
          <div className={mobileStyles.titleWrap}>
            <h3 className={mobileStyles.title}>Projects</h3>
            {renderIconsStrip()}
          </div>
          <div className={desktopStyles.viewToggle} role="group" aria-label="Select projects layout">
            <button
              type="button"
              className={desktopStyles.toggleButton}
              aria-pressed={viewMode === "table"}
              onClick={() => setViewMode("table")}
              aria-label="Show projects table"
            >
              Table
            </button>
            <button
              type="button"
              className={desktopStyles.toggleButton}
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              aria-label="Show project cards"
            >
              Cards
            </button>
          </div>
        </div>

        <div className={mobileStyles.recentsWrap} ref={filtersRef}>
          <button
            type="button"
            className={mobileStyles.recents}
            aria-expanded={filtersOpen}
            aria-haspopup="menu"
            aria-controls={filtersIdRef.current}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {scope === "recents" ? "Recents" : "All projects"} <ChevronDown size={14} aria-hidden />
          </button>
          {filtersOpen && (
            <div className={mobileStyles.filterPop} role="menu" id={filtersIdRef.current}>
              <div className={mobileStyles.filterSection}>
                <div
                  className={mobileStyles.scopeBtns}
                  role="group"
                  aria-label="Scope"
                >
                  <button
                    type="button"
                    className={`${mobileStyles.scopeBtn} ${
                      scope === "recents" ? mobileStyles.scopeBtnActive : ""
                    }`}
                    onClick={() => setScope("recents")}
                  >
                    Recents
                  </button>
                  <button
                    type="button"
                    className={`${mobileStyles.scopeBtn} ${
                      scope === "all" ? mobileStyles.scopeBtnActive : ""
                    }`}
                    onClick={() => setScope("all")}
                  >
                    All projects
                  </button>
                </div>

                <input
                  className={mobileStyles.input}
                  placeholder="Filter projects..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Filter projects"
                />

                {statuses.length > 0 && (
                  <select
                    className={mobileStyles.select}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by status"
                  >
                    <option value="">All statuses</option>
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  className={mobileStyles.select}
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  aria-label="Sort projects"
                >
                  <option value="titleAsc">Title (A-Z)</option>
                  <option value="titleDesc">Title (Z-A)</option>
                  <option value="dateNewest">Date (Newest)</option>
                  <option value="dateOldest">Date (Oldest)</option>
                </select>
              </div>
            </div>
          )}
        </div>

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

      <div className={desktopStyles.content}>{bodyContent}</div>

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
