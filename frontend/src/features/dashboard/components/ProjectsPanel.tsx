import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Kebab } from "@/shared/icons/Kebab";
import { useData } from "@/app/contexts/useData";
import SVGThumbnail from "./SvgThumbnail";
import styles from "./projects-panel.module.css";
import { useProjectKpis, type ProjectLike } from "../hooks/useProjectKpis";

type Props = {
  onOpenProject: (projectId: string) => void;
};

const DEFAULT_PROJECT_ROWS = 3;

type ProjectWithMeta = ProjectLike & { _activity: number; _created: number };

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

const ProjectsPanel: React.FC<Props> = ({ onOpenProject }) => {
  const { projects, isLoading, projectsError, fetchProjects } = useData();
  const navigate = useNavigate();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement | null>(null);

  // Compact filter/sort options (mirrors AllProjects)
  type SortOption = "titleAsc" | "titleDesc" | "dateNewest" | "dateOldest";
  const [sortOption, setSortOption] = useState<SortOption>("dateNewest");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [scope, setScope] = useState<"recents" | "all">("recents");
  // Icons-only strip lives next to the title; main list remains compact list rows

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

  // Close filters popover on outside click
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
          (projects as ProjectLike[])
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
      ...p,
      _activity: getProjectActivityTs(p),
      _created: new Date(p.dateCreated || p.date || 0).getTime() || 0,
    }));

    // Base ordering by scope
    let ordered = list.slice();
    if (scope === "recents") {
      ordered.sort((a, b) => b._activity - a._activity);
    }

    // Filters
    const q = query.trim().toLowerCase();
    if (q) {
      ordered = ordered.filter((p) =>
        (p.title || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      ordered = ordered.filter(
        (p) => String(p.status || "").toLowerCase() === statusFilter
      );
    }

    // Sort
    const byTitle = (a: ProjectLike, b: ProjectLike) =>
      (a.title || "").localeCompare(b.title || "", undefined, {
        sensitivity: "base",
      });
    const byCreated = (a: ProjectWithMeta, b: ProjectWithMeta) =>
      b._created - a._created; // newest first
    const byCreatedAsc = (a: ProjectWithMeta, b: ProjectWithMeta) =>
      a._created - b._created; // oldest first

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

    // Show fewer rows for Recents, all for All projects (scrolls in fixed panel)
    if (scope === "recents") {
      return ordered.slice(0, DEFAULT_PROJECT_ROWS);
    }
    return ordered;
  }, [projects, sortOption, statusFilter, query, scope]);

  const kpis = useProjectKpis(projects as ProjectLike[]);

  const errorText = projectsError ? "Failed to load projects." : undefined;

  const handleOpen = (id: string) => onOpenProject(id);

  const handleKeyRow = (e: React.KeyboardEvent, id: string) => {
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
    console.log(`Project ${id}: ${action}`);
    if (action === "open") handleOpen(id);
    setMenuOpenId(null);
  };

  const scopeLabel = scope === "recents" ? "Recents" : "All projects";

  return (
    <section aria-label="Projects" className={styles.panel}>
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>Projects</h3>
          {/* Icons strip: ultra-compact, icons only */}
          {(() => {
            const allProjects = projects as ProjectLike[];
            const maxIcons = 7;

            const shown = allProjects.slice(0, maxIcons);
            const more = Math.max(0, allProjects.length - shown.length);

            return (
              <div className={styles.iconsStrip} aria-label="Quick projects">
                {shown.map((p) => {
                  const id = p.projectId;
                  const title = (p.title || "Untitled project").trim();
                  const thumb =
                    Array.isArray(p.thumbnails) && p.thumbnails[0]
                      ? p.thumbnails[0]
                      : undefined;
                  return (
                    <button
                      key={`icon-${id}`}
                      type="button"
                      className={styles.iconBtnSm}
                      aria-label={`Open project ${title}`}
                      title={title}
                      onClick={() => handleOpen(id)}
                    >
                      {thumb && !imgError[id] ? (
                        <img
                          className={styles.thumbSm}
                          src={thumb}
                          alt=""
                          onError={() =>
                            setImgError((m) => ({ ...m, [id]: true }))
                          }
                        />
                      ) : (
                        <SVGThumbnail
                          initial={
                            (p.title || "Untitled project")
                              .trim()
                              .charAt(0)
                              .toUpperCase() || "#"
                          }
                          className={styles.thumbSm}
                        />
                      )}
                    </button>
                  );
                })}
                {more > 0 && (
                  <span className={styles.iconsMore} aria-hidden>
                    +{more}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
        <div className={styles.recentsWrap} ref={filtersRef}>
          <button
            type="button"
            className={styles.recents}
            aria-expanded={filtersOpen}
            aria-haspopup="menu"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            {scopeLabel} <ChevronDown size={14} aria-hidden />
          </button>
          {filtersOpen && (
            <div className={styles.filterPop} role="menu">
              <div className={styles.filterSection}>
                <div
                  className={styles.scopeBtns}
                  role="group"
                  aria-label="Scope"
                >
                  <button
                    type="button"
                    className={`${styles.scopeBtn} ${
                      scope === "recents" ? styles.scopeBtnActive : ""
                    }`}
                    onClick={() => setScope("recents")}
                  >
                    Recents
                  </button>
                  <button
                    type="button"
                    className={`${styles.scopeBtn} ${
                      scope === "all" ? styles.scopeBtnActive : ""
                    }`}
                    onClick={() => setScope("all")}
                  >
                    All projects
                  </button>
                </div>

                <input
                  className={styles.input}
                  placeholder="Filter projects..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Filter projects"
                />

                {statuses.length > 0 && (
                  <select
                    className={styles.select}
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
                  className={styles.select}
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

        <div className={styles.kpis}>
          <span className={styles.chip}>{kpis.totalProjects} Projects</span>
          <span className={styles.dot} />
          <span className={styles.chip}>{kpis.pendingProjects} Pending</span>
          <span className={styles.dot} />
          <span className={styles.chip}>
            {kpis.nextProject
              ? `Next: ${kpis.nextProject.title} ${kpis.nextProject.date}`
              : "No upcoming projects"}
          </span>
        </div>
      </header>

      {errorText && <div className={styles.inlineError}>{errorText}</div>}

      <div
        className={`${styles.list} ${
          scope === "all" ? styles.listScrollable : ""
        }`}
        role="list"
      >
        {isLoading ? (
          <div className={`${styles.row} ${styles.skeleton}`} aria-hidden>
            <div className={`${styles.icon} ${styles.skel}`} />
            <div className={styles.meta}>
              <div className={styles.skelBar} />
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty} role="note">
            No projects match filters
          </div>
        ) : (
          items.map((p) => {
            const dateIso =
              p.updatedAt ||
              p.dateUpdated ||
              p.lastModified ||
              p.date ||
              p.dateCreated;
            const dateLabel = formatShortDate(dateIso);
            const id = p.projectId;
            const title = (p.title || "Untitled project").trim();
            const isMenuOpen = menuOpenId === id;
            const onKey = (e: React.KeyboardEvent) => handleKeyRow(e, id);
            const thumb =
              Array.isArray(p.thumbnails) && p.thumbnails[0]
                ? p.thumbnails[0]
                : undefined;
            return (
              <div key={id} className={styles.row} role="listitem">
                <div
                  className={styles.rowMain}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpen(id)}
                  onKeyDown={onKey}
                  aria-label={`Open project ${title}`}
                >
                  <div className={styles.icon} aria-hidden>
                    {thumb && !imgError[id] ? (
                      <img
                        className={styles.thumb}
                        src={thumb}
                        alt=""
                        onError={() =>
                          setImgError((m) => ({ ...m, [id]: true }))
                        }
                      />
                    ) : (
                      <SVGThumbnail
                        initial={
                          title.charAt(0).toUpperCase() || "#"
                        }
                        className={styles.thumb}
                      />
                    )}
                  </div>
                  <div className={styles.meta}>
                    <div className={styles.titleRow}>
                      <div className={styles.titleLeft}>
                        <span className={styles.name}>{title}</span>
                      </div>
                      {dateLabel ? (
                        <span className={styles.dateInline}>{dateLabel}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div
                  className={`${styles.menu} ${
                    isMenuOpen ? styles.menuOpen : ""
                  }`}
                  ref={(el) => {
                    menuRefs.current[id] = el;
                  }}
                >
                  <button
                    type="button"
                    className={styles.menuBtn}
                    aria-label="Project actions"
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    onClick={() => toggleMenu(id)}
                  >
                    <Kebab size={20} aria-hidden />
                  </button>
                  {isMenuOpen && (
                    <div className={styles.menuPop} role="menu">
                      <button
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={() => onAction("open", id)}
                      >
                        Open
                      </button>
                      <button
                        className={styles.menuItem}
                        role="menuitem"
                        onClick={() => onAction("pin", id)}
                      >
                        Pin
                      </button>
                      <button
                        className={styles.menuItem}
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
          })
        )}
      </div>

      <div className={styles.ctaWrap}>
        <button
          type="button"
          className={styles.cta}
          onClick={() => navigate("/dashboard/projects")}
        >
          See all projects
        </button>
      </div>
    </section>
  );
};

export default ProjectsPanel;
