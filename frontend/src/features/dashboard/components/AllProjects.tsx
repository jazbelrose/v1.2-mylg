import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import SVGThumbnail from './SvgThumbnail';
import { useData } from '@/app/contexts/useData';
import Spinner from '../../../shared/ui/Spinner';
import { useNavigate } from 'react-router-dom';
import { slugify } from '../../../shared/utils/slug';
import AvatarStack from '../../../shared/ui/AvatarStack';
import type { UserLite, TeamMember } from '../../../app/contexts/DataProvider';
import {
  LayoutGrid,
  List,
  Search,
  MoreVertical,
  Pin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Project {
  projectId: string;
  title?: string; // <-- make optional
  description?: string;
  status?: string;
  thumbnails?: string[];
  dateCreated?: string;
  date?: string;
  pinned?: boolean;
  team?: {
    userId: string;
    firstName?: string;
    lastName?: string;
    thumbnail?: string;
  }[];
}

type SortOption = 'titleAsc' | 'titleDesc' | 'dateNewest' | 'dateOldest';

const sortLabels: Record<SortOption, string> = {
  titleAsc: 'A → Z',
  titleDesc: 'Z → A',
  dateNewest: 'Newest →',
  dateOldest: 'Oldest ←',
};

const ProgressRing: React.FC<{ value: number }> = ({ value }) => {
  const radius = 12;
  const stroke = 2;
  const normalized = radius - stroke;
  const circumference = normalized * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg
      className="progress-ring"
      height={radius * 2}
      width={radius * 2}
    >
      <circle
        stroke="#333"
        fill="transparent"
        strokeWidth={stroke}
        r={normalized}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="var(--brand)"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        r={normalized}
        cx={radius}
        cy={radius}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset: offset }}
      />
      <text
        x="50%"
        y="50%"
        dy=".3em"
        textAnchor="middle"
        fontSize="8"
        fill="#fff"
      >
        {Math.round(value)}
      </text>
    </svg>
  );
};

const AllProjects: React.FC = () => {
  const { projects, isLoading, fetchProjectDetails, projectsError, fetchProjects, allUsers } = useData();
  const navigate = useNavigate();
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [sortOption, setSortOption] = useState<SortOption>('titleAsc');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sortOpen, setSortOpen] = useState(false);

  // Ensure projects are loaded when this view is displayed
  useEffect(() => {
    if (!isLoading && projects.length === 0 && !projectsError) {
      fetchProjects();
    }
  }, [isLoading, projects.length, projectsError, fetchProjects]);

  const onSelectProject = async (project: Project): Promise<void> => {
    try {
      await fetchProjectDetails(project.projectId);
      const safeTitle =
        (project.title && project.title.trim()) ||
        `project-${project.projectId.slice(0, 6)}`;
      const slug = slugify(safeTitle);
      navigate(`/dashboard/projects/${slug}`);
    } catch (err) {
      console.error('Error loading project', err);
    }
  };

  // Preload project thumbnails
  useEffect(() => {
    projects.forEach((p: Project) => {
      if (p.thumbnails && p.thumbnails[0]) {
        const img = new Image();
        img.src = p.thumbnails[0];
      }
    });
  }, [projects]);

  // Quick map for user lookups (thumbnails/names)
  const usersById = useMemo(() => {
    const map = new Map<string, UserLite>();
    (Array.isArray(allUsers) ? allUsers : []).forEach((u: UserLite) => {
      if (u?.userId) map.set(u.userId, u);
    });
    return map;
  }, [allUsers]);

  const handleProjectClick = (project: Project): void => {
    onSelectProject(project);
  };

  const handleKeyDown = (e: React.KeyboardEvent, project: Project): void => {
    if (e.key === 'Enter') {
      handleProjectClick(project);
    }
  };

  const sortRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuOpenId) {
        const el = menuRefs.current[menuOpenId];
        if (el && e.target instanceof Node && !el.contains(e.target)) {
          setMenuOpenId(null);
        }
      }
      if (sortOpen && sortRef.current && e.target instanceof Node && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [menuOpenId, sortOpen]);

  const toggleMenu = (id: string) =>
    setMenuOpenId((prev) => (prev === id ? null : id));

  const onAction = (
    action: 'open' | 'pin' | 'unpin' | 'archive',
    id: string,
  ) => {
    if (action === 'open') {
      const proj = projects.find((p: Project) => p.projectId === id);
      if (proj) handleProjectClick(proj);
    }
    console.log(`Project ${id}: ${action}`);
    setMenuOpenId(null);
  };

  const isPercentageStatus = (s: string): boolean => {
    const cleaned = s.replace('%', '').trim();
    const num = Number(cleaned);
    return cleaned !== '' && !Number.isNaN(num) && num >= 0 && num <= 100;
  };

  const statusOptions = useMemo(() => {
    const statuses = projects
      .map((p: Project) => (p.status || '').toLowerCase())
      .filter((s) => s && !isPercentageStatus(s)) as string[];
    return Array.from(new Set(statuses));
  }, [projects]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    projects.forEach((p: Project) => {
      const s = (p.status || '').toLowerCase();
      if (s && !isPercentageStatus(s)) map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [projects]);

  const formatShortDate = (iso?: string): string | undefined => {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric' });
  };

  const normalizedQuery = filterQuery.trim().toLowerCase();
  const filteredProjects = projects.filter((p: Project) => {
    const title = (p.title || '').toLowerCase();
    const description = (p.description || '').toLowerCase();
    const status = (p.status || '').toLowerCase();
    const matchesQuery = title.includes(normalizedQuery) || description.includes(normalizedQuery);
    const matchesStatus = !statusFilter || status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const sortedProjects = filteredProjects.slice().sort((a: Project, b: Project) => {
    const titleA = (a.title || '').toLowerCase();
    const titleB = (b.title || '').toLowerCase();
    const dateA = new Date(a.dateCreated || a.date || 0).getTime();
    const dateB = new Date(b.dateCreated || b.date || 0).getTime();

    switch (sortOption) {
      case 'titleDesc':
        return titleB.localeCompare(titleA);
      case 'dateNewest':
        return dateB - dateA;
      case 'dateOldest':
        return dateA - dateB;
      case 'titleAsc':
      default:
        return titleA.localeCompare(titleB);
    }
  });

  const isSingleProject = sortedProjects.length === 1;

  let content: React.ReactElement;

  if (isLoading) {
    content = (
      <div
        className="all-projects-container-welcome"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          width: '100%',
        }}
      >
        <Spinner />
      </div>
    );
  } else if (projectsError) {
    content = (
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <p style={{ fontSize: '14px', color: '#aaa', textAlign: 'center' }}>
          Failed to load projects.
        </p>
      </div>
    );
  } else if (projects.length === 0) {
    content = (
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <p style={{ fontSize: '14px', color: '#aaa', textAlign: 'center' }}>
          No projects yet!
        </p>
      </div>
    );
  } else if (sortedProjects.length === 0) {
    content = (
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <p style={{ fontSize: '14px', color: '#aaa', textAlign: 'center' }}>
          No matching projects
        </p>
      </div>
    );
  } else if (viewMode === 'grid') {
    content = (
      <div
        className={`all-projects-container-welcome ${
          isSingleProject ? 'single-item' : ''
        }`}
      >
        {sortedProjects.map((project: Project) => (
          <div
            key={project.projectId}
            className={`project-container-welcome ${
              isSingleProject ? 'single-item' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => handleProjectClick(project)}
            onKeyDown={(e) => handleKeyDown(e, project)}
            aria-label={`Open project ${
              project.title?.trim() || 'Untitled project'
            }`}
          >
            {!imageErrors[project.projectId] &&
            project.thumbnails &&
            project.thumbnails.length > 0 ? (
              <img
                src={project.thumbnails[0]}
                alt={`Thumbnail of ${
                  project.title?.trim() || 'Untitled project'
                }`}
                className="project-thumbnail"
                loading="lazy"
                decoding="async"
                onError={() =>
                  setImageErrors((prev) => ({
                    ...prev,
                    [project.projectId]: true,
                  }))
                }
              />
            ) : (
              <SVGThumbnail
                initial={
                  project.title?.trim()?.charAt(0)?.toUpperCase() || '#'
                }
                className="project-thumbnail"
              />
            )}
            <h6 className="project-title">
              {project.title?.trim() || 'Untitled project'}
            </h6>
          </div>
        ))}
      </div>
    );
  } else {
    // Helper to normalize status text (append % if it's a bare number)
    const formatStatus = (s?: string) => {
      const raw = (s || '').trim();
      if (!raw) return '';
      const num = Number(raw);
      if (!Number.isNaN(num) && /%/.test(raw) === false && num >= 0 && num <= 100) {
        return `${num}%`;
      }
      return raw;
    };

    const normalizeTeam = (team?: Project['team']) => {
      if (!Array.isArray(team)) return [] as NonNullable<Project['team']>;
      return team.map((m: TeamMember) => {
        const u = usersById.get(m.userId) || {} as UserLite;
        return {
          userId: m.userId,
          firstName: (m.firstName || u.firstName) as string,
          lastName: (m.lastName || u.lastName) as string,
          // prefer member thumbnail, then user profile variants
          thumbnail:
            (m.thumbnail ||
            u.thumbnail ||
            m.photoUrl ||
            u.photoUrl ||
            m.avatar ||
            u.avatar ||
            m.avatarUrl ||
            u.avatarUrl ||
            m.image ||
            u.image ||
            m.profileImage ||
            u.profileImage ||
            m.profilePicture ||
            u.profilePicture ||
            m.picture ||
            u.picture) as string | undefined,
        };
      });
    };

    content = (
      <ul className="projects-list">
        {sortedProjects.map((project: Project) => {
          const statusText = formatStatus(project.status);
          const team = normalizeTeam(project.team);
          const progress = Number(statusText.replace('%', ''));
          const showProgress =
            !Number.isNaN(progress) && progress >= 0 && progress <= 100;
          const dateLabel = formatShortDate(project.dateCreated || project.date);
          const isMenuOpen = menuOpenId === project.projectId;
          return (
            <li
              key={project.projectId}
              className="project-list-item"
              role="button"
              tabIndex={0}
              onClick={() => handleProjectClick(project)}
              onKeyDown={(e) => handleKeyDown(e, project)}
              aria-label={`Open project ${
                project.title?.trim() || 'Untitled project'
              }`}
            >
              {!imageErrors[project.projectId] &&
              project.thumbnails &&
              project.thumbnails.length > 0 ? (
                <img
                  src={project.thumbnails[0]}
                  alt={`Thumbnail of ${
                    project.title?.trim() || 'Untitled project'
                  }`}
                  className="project-list-thumb"
                  loading="lazy"
                  decoding="async"
                  onError={() =>
                    setImageErrors((prev) => ({
                      ...prev,
                      [project.projectId]: true,
                    }))
                  }
                />
              ) : (
                <SVGThumbnail
                  initial={
                    project.title?.trim()?.charAt(0)?.toUpperCase() || '#'
                  }
                  className="project-list-thumb"
                />
              )}
              <div className="project-list-info">
                <div className="project-title-row">
                  <span className="project-list-title">
                    {project.title?.trim() || 'Untitled project'}
                  </span>
                  {dateLabel && (
                    <span className="project-list-date">{dateLabel}</span>
                  )}
                </div>
              </div>
              <div className="project-list-actions">
                {showProgress && <ProgressRing value={progress} />}
                {!showProgress && statusText && (
                  <span className="project-list-status">{statusText}</span>
                )}
                {team.length > 0 && (
                  <div className="project-list-team">
                    <AvatarStack members={team} size={24} />
                  </div>
                )}
                {project.pinned && <Pin size={14} className="pin-indicator" />}
              </div>
              <div
                className="project-menu"
                ref={(el) => {
                  menuRefs.current[project.projectId] = el;
                }}
              >
                <button
                  type="button"
                  className="project-menu-btn"
                  aria-label="Project actions"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMenu(project.projectId);
                  }}
                >
                  <MoreVertical size={16} />
                </button>
                {isMenuOpen && (
                  <div className="project-menu-pop" role="menu">
                    <button
                      className="project-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('open', project.projectId);
                      }}
                    >
                      Open
                    </button>
                    <button
                      className="project-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction(
                          project.pinned ? 'unpin' : 'pin',
                          project.projectId,
                        );
                      }}
                    >
                      {project.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      className="project-menu-item"
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction('archive', project.projectId);
                      }}
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="welcome project-view">
      <div className="projects-header">
        <div className="projects-title">Projects</div>
        <div className="project-pills">
          {[{ key: 'all', label: `All Projects (${projects.length})` },
            ...statusOptions.map((s) => ({
              key: s,
              label: `${s.charAt(0).toUpperCase() + s.slice(1)} (${statusCounts[s] || 0})`,
            })),
          ].map((p) => {
            const active =
              (p.key === 'all' && !statusFilter) || statusFilter === p.key;
            return (
              <button
                key={p.key}
                className={`pill ${active ? 'active' : ''}`}
                onClick={() =>
                  setStatusFilter(p.key === 'all' ? '' : p.key.toString())
                }
              >
                {p.label}
                {active && (
                  <motion.div
                    layoutId="pill-underline"
                    className="pill-underline"
                  />
                )}
              </button>
            );
          })}
          <div className="sort-wrapper" ref={sortRef}>
            <button
              type="button"
              className={`pill sort-pill ${sortOpen ? 'active' : ''}`}
              onClick={() => setSortOpen((o) => !o)}
            >
              {`Sort (${sortLabels[sortOption]})`}
              {sortOpen && (
                <motion.div
                  layoutId="pill-underline"
                  className="pill-underline"
                />
              )}
            </button>
            {sortOpen && (
              <div className="sort-menu" role="menu">
                {Object.entries(sortLabels).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => {
                      setSortOption(value as SortOption);
                      setSortOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="search-pill">
            <AnimatePresence initial={false}>
              {searchOpen ? (
                <motion.input
                  key="input"
                  className="search-input"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 140, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  onBlur={() => setSearchOpen(false)}
                  placeholder="Search"
                />
              ) : (
                <motion.button
                  key="button"
                  type="button"
                  className="pill icon-pill"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
      {content}
    </div>
  );
};

export default AllProjects;
