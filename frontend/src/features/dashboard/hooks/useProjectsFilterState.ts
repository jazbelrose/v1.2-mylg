import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

import type { ProjectLike } from "./useProjectKpis";

export type ScopeOption = "recents" | "all";

export type SortOption = "titleAsc" | "titleDesc" | "dateNewest" | "dateOldest";

export type ProjectWithMeta = ProjectLike & {
  _activity: number;
  _created: number;
};

export type StatusOption = {
  value: string;
  label: string;
};

export type SortOptionDescriptor = {
  value: SortOption;
  label: string;
};

export const PROJECT_SORT_OPTIONS: SortOptionDescriptor[] = [
  { value: "titleAsc", label: "Title (A-Z)" },
  { value: "titleDesc", label: "Title (Z-A)" },
  { value: "dateNewest", label: "Date (Newest)" },
  { value: "dateOldest", label: "Date (Oldest)" },
];

export type UseProjectsFilterConfig = {
  defaultScope?: ScopeOption;
  defaultSort?: SortOption;
  recentsLimit?: number;
};

export type UseProjectsFilterState = {
  scope: ScopeOption;
  setScope: Dispatch<SetStateAction<ScopeOption>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  sortOption: SortOption;
  setSortOption: Dispatch<SetStateAction<SortOption>>;
  statuses: string[];
  statusOptions: StatusOption[];
  sortOptions: SortOptionDescriptor[];
  filteredProjects: ProjectWithMeta[];
  visibleProjects: ProjectWithMeta[];
};

const getProjectActivityTs = (project: ProjectLike): number => {
  const candidates: (string | undefined)[] = [
    project.updatedAt,
    project.dateUpdated,
    project.lastModified,
    project.date,
    project.dateCreated,
  ];

  if (Array.isArray(project.timelineEvents)) {
    for (const event of project.timelineEvents) {
      if (event?.timestamp) candidates.push(event.timestamp);
      if (event?.date) candidates.push(event.date);
    }
  }

  const timestamps = candidates
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter((value) => Number.isFinite(value));

  return timestamps.length ? Math.max(...timestamps) : 0;
};

const mapProjectsWithMeta = (projects: ProjectLike[] = []): ProjectWithMeta[] =>
  projects.map((project) => ({
    ...(project as ProjectWithMeta),
    _activity: getProjectActivityTs(project),
    _created: new Date(project.dateCreated || project.date || 0).getTime() || 0,
  }));

export const useProjectsFilterState = (
  projects: ProjectLike[] | undefined,
  config: UseProjectsFilterConfig = {}
): UseProjectsFilterState => {
  const { defaultScope = "recents", defaultSort = "dateNewest", recentsLimit } = config;

  const [scope, setScope] = useState<ScopeOption>(defaultScope);
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>(defaultSort);

  const statuses = useMemo(() => {
    const source = Array.isArray(projects) ? projects : [];

    try {
      return Array.from(
        new Set(
          source
            .map((project) => String(project.status || "").toLowerCase())
            .filter(Boolean)
        )
      );
    } catch {
      return [] as string[];
    }
  }, [projects]);

  const statusOptions = useMemo<StatusOption[]>(
    () => [{ value: "", label: "All statuses" }, ...statuses.map((status) => ({ value: status, label: status }))],
    [statuses]
  );

  const list = useMemo(
    () => mapProjectsWithMeta(Array.isArray(projects) ? projects : []),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    let ordered = list.slice();

    if (scope === "recents") {
      ordered.sort((a, b) => b._activity - a._activity);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      ordered = ordered.filter((project) => (project.title || "").toLowerCase().includes(q));
    }

    if (statusFilter) {
      ordered = ordered.filter(
        (project) => String(project.status || "").toLowerCase() === statusFilter
      );
    }

    const byTitle = (a: ProjectLike, b: ProjectLike) =>
      (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
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

    return ordered;
  }, [list, scope, query, statusFilter, sortOption]);

  const visibleProjects = useMemo(() => {
    if (scope === "recents" && typeof recentsLimit === "number") {
      return filteredProjects.slice(0, recentsLimit);
    }
    return filteredProjects;
  }, [filteredProjects, scope, recentsLimit]);

  return {
    scope,
    setScope,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    sortOption,
    setSortOption,
    statuses,
    statusOptions,
    sortOptions: PROJECT_SORT_OPTIONS,
    filteredProjects,
    visibleProjects,
  };
};

export default useProjectsFilterState;
