// src/app/contexts/ProjectsProvider.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  PropsWithChildren,
} from "react";
import { v4 as uuid } from "uuid";
import pLimit from "../../shared/utils/pLimit";
import { useAuth } from "./useAuth";
import {
  fetchProjectsFromApi,
  fetchProjectById,
  fetchEvents,
  updateTimelineEvents as updateTimelineEventsApi,
  updateProjectFields as updateProjectFieldsApi,
  apiFetch,
  GET_PROJECT_MESSAGES_URL,
} from "../../shared/utils/api";
import { getWithTTL, setWithTTL, DEFAULT_TTL } from "../../shared/utils/storageWithTTL";
import { ProjectsContext } from "./ProjectsContext";
import type { ProjectsValue, DMReadStatusMap } from "./ProjectsContextValue";
import type { Project, TimelineEvent, Message } from "./DataProvider";

const mergeProjectWithFallback = (
  primary: Project,
  fallback?: Project | null
): Project => {
  if (!fallback) return primary;

  const merged: Project = { ...fallback, ...primary };

  (Object.keys(primary) as Array<keyof Project>).forEach((key) => {
    if (primary[key] === undefined && fallback[key] !== undefined) {
      merged[key] = fallback[key] as never;
    }
  });

  if (primary.timelineEvents !== undefined) {
    merged.timelineEvents = primary.timelineEvents;
  } else if (fallback.timelineEvents !== undefined && merged.timelineEvents === undefined) {
    merged.timelineEvents = fallback.timelineEvents;
  }

  if (Array.isArray(primary.thumbnails)) {
    merged.thumbnails = primary.thumbnails;
  } else if (
    (primary.thumbnails === undefined || primary.thumbnails === null) &&
    Array.isArray(fallback.thumbnails)
  ) {
    merged.thumbnails = fallback.thumbnails;
  }

  return merged;
};

const projectNeedsDetailHydration = (project: Project | null | undefined): project is Project =>
  Boolean(project) && (project.description === undefined || project.customFolders === undefined);

const DEFAULT_PROJECTS_ERROR_MESSAGE =
  "Failed to load projects. Please check your API configuration and try again.";

const deriveProjectsErrorMessage = (error: unknown): string => {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : (error as { message?: unknown })?.message &&
        typeof (error as { message?: unknown }).message === "string"
      ? ((error as { message: string }).message)
      : "";

  if (/failed to fetch/i.test(message) || /network request failed/i.test(message)) {
    return (
      "Unable to reach the MYLG API. This often happens when the remote endpoint " +
      "blocks requests from http://localhost:5173 (CORS) or when the backend is offline. " +
      "Make sure your API Gateway allows this origin or set VITE_API_BASE_URL / " +
      "VITE_PROJECTS_SERVICE_URL to a reachable endpoint."
    );
  }

  if (/503/.test(message) || /service unavailable/i.test(message)) {
    return (
      "The Projects API responded with \"503 Service Unavailable\". Verify that the " +
      "service is deployed, that the request targets the correct stage (for example, /dev), " +
      "and that CORS is configured to allow your origin."
    );
  }

  if (message) {
    return `${DEFAULT_PROJECTS_ERROR_MESSAGE} (${message})`;
  }

  return DEFAULT_PROJECTS_ERROR_MESSAGE;
};

export const ProjectsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { userId } = useAuth();

  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(false);
  const [projectsErrorMessage, setProjectsErrorMessage] = useState<string | null>(null);
  const [loadingProfile] = useState(false);

  const [activeProject, setActiveProject] = useState<Project | null>(() => {
    try {
      const stored = localStorage.getItem("dashboardActiveProject");
      return stored ? (JSON.parse(stored) as Project) : null;
    } catch {
      return null;
    }
  });

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectsViewState] = useState<string>(() => {
    try {
      return localStorage.getItem("dashboardViewState") || "welcome";
    } catch {
      return "welcome";
    }
  });

  const [opacity, setOpacity] = useState(0);
  const [settingsUpdated, setSettingsUpdated] = useState(false);

  const [dmReadStatus, setDmReadStatus] = useState<DMReadStatusMap>(() => {
    const stored = getWithTTL("dmReadStatus");
    return stored && typeof stored === "object" ? (stored as DMReadStatusMap) : {};
  });

  useEffect(() => {
    setWithTTL("dmReadStatus", dmReadStatus, DEFAULT_TTL);
  }, [dmReadStatus]);

  // Persist UI bits
  useEffect(() => {
    try {
      localStorage.setItem("dashboardViewState", projectsViewState);
    } catch {
      /* ignore */
    }
  }, [projectsViewState]);

  useEffect(() => {
    try {
      if (activeProject) {
        localStorage.setItem("dashboardActiveProject", JSON.stringify(activeProject));
      } else {
        localStorage.removeItem("dashboardActiveProject");
      }
    } catch {
      /* ignore */
    }
  }, [activeProject]);

  // Helpers for event IDs
  const addIdsToEvents = useCallback((events: TimelineEvent[]) => {
    let changed = false;
    const seen = new Set<string>();
    const withIds: TimelineEvent[] = [];

    events.forEach((ev) => {
      let id = ev.id;
      if (!id) {
        id = uuid();
        changed = true;
      }
      if (seen.has(id)) {
        changed = true;
        return; // skip duplicates
      }
      seen.add(id);
      withIds.push(ev.id === id ? ev : { ...ev, id });
    });

    return { events: withIds, changed };
  }, []);

  const ensureProjectsHaveEventIds = useCallback(async (items: Project[]) => {
    const limit = pLimit(3) as <T>(fn: () => Promise<T>) => Promise<T>;
    const updated: Project[] = new Array(items.length);
    const tasks: Array<Promise<void>> = [];

    items.forEach((p, idx) => {
      if (!Array.isArray(p.timelineEvents)) {
        updated[idx] = p;
        return;
      }
      const { events, changed } = addIdsToEvents(p.timelineEvents);
      if (changed) {
        tasks.push(
          limit(async () => {
            try {
              await updateTimelineEventsApi(p.projectId, events);
            } catch (err) {
              console.error("Error persisting event ids", err);
            }
            updated[idx] = { ...p, timelineEvents: events };
          })
        );
      } else {
        updated[idx] = p;
      }
    });

    await Promise.all(tasks);
    return updated;
  }, [addIdsToEvents]);

  const toggleSettingsUpdated = () => setSettingsUpdated((prev) => !prev);

  // Projects (debounced-ish)
  const lastFetchRef = useRef(0);
  const fetchProjects = useCallback<ProjectsValue["fetchProjects"]>(
    async (retryCount = 0) => {
      const now = Date.now();
      if (now - lastFetchRef.current < 2000 && retryCount === 0) return;
      lastFetchRef.current = now;

      setIsLoading(true);
      try {
        console.log('Fetching projects for userId:', userId);
        const dataItems = await fetchProjectsFromApi(userId);
        console.log('Received dataItems:', dataItems);
        
        const limit = pLimit(3) as <T>(fn: () => Promise<T>) => Promise<T>;

        const withEvents = await Promise.all(
          (Array.isArray(dataItems) ? (dataItems as Project[]) : []).map((p) =>
            limit(async () => {
              try {
                const events = await fetchEvents(p.projectId);
                return { ...p, timelineEvents: events as TimelineEvent[] };
              } catch (err) {
                console.error("Failed to fetch events", err);
                return { ...p, timelineEvents: [] as TimelineEvent[] };
              }
            })
          )
        );

        const withIds = await ensureProjectsHaveEventIds(withEvents);
        if (!withIds || !Array.isArray(withIds)) {
          console.error("Invalid data received:", dataItems);
          setProjects([]);
          setUserProjects([]);
          return;
        }

        const detailed = await Promise.all(
          withIds.map(async (proj) => {
            let hydrated = proj;
            const cacheKey = `project-${proj.projectId}`;

            if (projectNeedsDetailHydration(hydrated)) {
              try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                  const parsed = JSON.parse(cached) as Project;
                  hydrated = mergeProjectWithFallback(hydrated, parsed);
                }
              } catch {
                /* ignore */
              }
            }

            if (projectNeedsDetailHydration(hydrated)) {
              try {
                const fetched = (await fetchProjectById(proj.projectId)) as Project | null;
                if (fetched) {
                  hydrated = mergeProjectWithFallback(hydrated, fetched);
                }
              } catch (err) {
                console.error("Failed to fetch project details", err);
              }
            }

            try {
              localStorage.setItem(cacheKey, JSON.stringify(hydrated));
            } catch {
              /* ignore */
            }

            return hydrated;
          })
        );

        setProjects(detailed);
        setUserProjects(detailed);
        setActiveProject((prev) => {
          if (!prev) return prev;
          const updated = detailed.find((p) => p.projectId === prev.projectId);
          return updated ?? prev;
        });
        setProjectsError(false);
        setProjectsErrorMessage(null);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjectsError(true);
        setProjectsErrorMessage(deriveProjectsErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [userId, ensureProjectsHaveEventIds]
  );

  useEffect(() => {
    if (!userId) return;
    fetchProjects();
  }, [userId, fetchProjects]);

  // Single project details
  const fetchProjectDetails = useCallback<ProjectsValue["fetchProjectDetails"]>(
    async (projectId) => {
      if (!projects || !Array.isArray(projects)) {
        console.error("Projects data is not available yet.");
        return false;
      }
      let project = projects.find((p) => p.projectId === projectId);
      let fetchFailed = false;

      // Attempt to hydrate from localStorage when important fields are missing
      if (projectNeedsDetailHydration(project)) {
        try {
          const cached = localStorage.getItem(`project-${projectId}`);
          if (cached) {
            const parsed = JSON.parse(cached) as Project;
            project = mergeProjectWithFallback(project, parsed);
            setProjects((prev) => {
              if (!Array.isArray(prev)) return prev;
              const idx = prev.findIndex((p) => p.projectId === projectId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = project;
                return updated;
              }
              return [...prev, project];
            });
          }
        } catch {
          /* ignore */
        }
      }

      if (
        !project ||
        !Array.isArray(project.team) ||
        project.description === undefined ||
        project.customFolders === undefined
      ) {
        try {
          const fetched = (await fetchProjectById(projectId)) as Project | undefined;
          if (fetched) {
            const previousProject = project;
            try {
              const events = (await fetchEvents(projectId)) as TimelineEvent[];
              project = mergeProjectWithFallback(
                { ...fetched, timelineEvents: events },
                previousProject
              );
            } catch (err) {
              console.error("Failed to fetch events", err);
              project = mergeProjectWithFallback(
                { ...fetched, timelineEvents: [] },
                previousProject
              );
            }

            setProjects((prev) => {
              if (!Array.isArray(prev)) return prev;
              const idx = prev.findIndex((p) => p.projectId === projectId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = project;
                return updated;
              }
              return [...prev, project];
            });
          }
        } catch (err) {
          fetchFailed = true;
          console.error("Error fetching project details", err);
        }
      } else if (!Array.isArray(project.timelineEvents)) {
        try {
          const events = (await fetchEvents(projectId)) as TimelineEvent[];
          project = mergeProjectWithFallback(
            { ...project, timelineEvents: events },
            project
          );
        } catch (err) {
          console.error("Failed to fetch events", err);
          project = mergeProjectWithFallback(
            { ...project, timelineEvents: [] },
            project
          );
        }
      }

      if (project) {
        let patched: Project = project;
        if (!Array.isArray(patched.team)) {
          patched = { ...patched, team: [] };
        }
        if (Array.isArray(project.timelineEvents)) {
          const { events, changed } = addIdsToEvents(project.timelineEvents);
          if (changed) {
            patched = { ...patched, timelineEvents: events };
            updateTimelineEventsApi(project.projectId, events).catch((err: unknown) => {
              console.error("Error persisting event ids", err);
            });
          }
        }
        setActiveProject(patched);
        try {
          localStorage.setItem(`project-${projectId}`, JSON.stringify(patched));
        } catch {
          /* ignore */
        }
        return true;
      }

      console.error(`Project with projectId: ${projectId} not found`);
      if (!fetchFailed) {
        setActiveProject((prev) => (prev?.projectId === projectId ? null : prev));
      }
      return false;
    },
    [projects, addIdsToEvents]
  );

  // Placeholder for fetchUserProfile - moved to AuthDataProvider
  const fetchUserProfile = useCallback(async () => {
    // This is now handled by AuthDataProvider
    console.log("fetchUserProfile called from ProjectsProvider - should use AuthDataProvider");
  }, []);

  // Update timeline
  const updateTimelineEvents = useCallback(async (projectId: string, events: TimelineEvent[]) => {
    const { events: withIds } = addIdsToEvents(events);
    try {
      await updateTimelineEventsApi(projectId, withIds);
      setActiveProject((prev) =>
        prev && prev.projectId === projectId ? { ...prev, timelineEvents: withIds } : prev
      );
      setProjects((prev) =>
        Array.isArray(prev)
          ? prev.map((p) => (p.projectId === projectId ? { ...p, timelineEvents: withIds } : p))
          : prev
      );
      setUserProjects((prev) =>
        Array.isArray(prev)
          ? prev.map((p) => (p.projectId === projectId ? { ...p, timelineEvents: withIds } : p))
          : prev
      );
    } catch (error) {
      console.error("Error updating timeline events:", error);
    }
  }, [addIdsToEvents]);

  // Generic project field update
  const updateProjectFields = async (projectId: string, fields: Partial<Project>) => {
    try {
      await updateProjectFieldsApi(projectId, fields);
      let mergedProject: Project | undefined;
      const merge = <T extends Project | null | undefined>(project: T): T => {
        if (!project || project.projectId !== projectId) return project;
        const updated: Project = { ...project };
        Object.entries(fields).forEach(([key, value]) => {
          if (key === "thumbnails" && Array.isArray(value)) {
            const prevThumbs = Array.isArray(project.thumbnails) ? project.thumbnails : [];
            updated.thumbnails = Array.from(new Set([...(value as string[]), ...prevThumbs]));
          } else {
            updated[key] = value as never;
          }
        });
        mergedProject = updated;
        return updated as T;
      };

      setActiveProject((prev) => merge(prev));
      setProjects((prev) => (Array.isArray(prev) ? prev.map((p) => merge(p)) : prev));
      setUserProjects((prev) => (Array.isArray(prev) ? prev.map((p) => merge(p)) : prev));

      if (mergedProject) {
        try {
          localStorage.setItem(`project-${projectId}`, JSON.stringify(mergedProject));
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.error("Error updating project fields:", error);
    }
  };

  // Recent activity
  const fetchRecentActivity = useCallback<ProjectsValue["fetchRecentActivity"]>(
    async (limit = 10) => {
      try {
        const events: Awaited<ReturnType<ProjectsValue["fetchRecentActivity"]>> = [];
        const projectsList = Array.isArray(userProjects) ? userProjects : [];

        for (const project of projectsList) {
          const projectTitle = project.title || "Project";
          const timeline = Array.isArray(project.timelineEvents) ? project.timelineEvents : [];
          timeline.forEach((ev) => {
            const ts = (ev.date || ev.timestamp) as string | undefined;
            if (!ts) return;
            events.push({
              id: `proj-${project.projectId}-${ev.id || uuid()}`,
              type: "project",
              projectId: project.projectId,
              projectTitle,
              text: ev.title || "Project updated",
              timestamp: ts,
            });
          });

          try {
            const msgs = await apiFetch<Message[] | unknown>(
              `${GET_PROJECT_MESSAGES_URL}?projectId=${project.projectId}`
            );
            if (Array.isArray(msgs)) {
              msgs.forEach((m) => {
                if (!m.timestamp) return;
                events.push({
                  id: `msg-${m.messageId || m.optimisticId}`,
                  type: "message",
                  projectId: project.projectId,
                  projectTitle,
                  text: m.text || m.body || m.content || "New message",
                  timestamp: m.timestamp,
                });
              });
            }
          } catch (err) {
            console.error("Failed to fetch messages for activity", err);
          }
        }

        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return events.slice(0, limit);
      } catch (err) {
        console.error("fetchRecentActivity error", err);
        return [];
      }
    },
    [userProjects]
  );

  const projectsValue = useMemo<ProjectsValue>(
    () => ({
      projects: userProjects,
      setProjects,
      setUserProjects,
      isLoading,
      setIsLoading,
      loadingProfile,
      activeProject,
      setActiveProject,
      selectedProjects,
      setSelectedProjects,
      fetchProjectDetails,
      fetchProjects,
      fetchUserProfile,
      fetchRecentActivity,
      opacity,
      setOpacity,
      settingsUpdated,
      toggleSettingsUpdated,
      dmReadStatus,
      setDmReadStatus,
      projectsError,
      projectsErrorMessage,
      updateTimelineEvents,
      updateProjectFields,
    }),
    [
      userProjects,
      isLoading,
      loadingProfile,
      activeProject,
      selectedProjects,
      fetchProjectDetails,
      fetchProjects,
      fetchUserProfile,
      fetchRecentActivity,
      opacity,
      settingsUpdated,
      dmReadStatus,
      projectsError,
      projectsErrorMessage,
      updateTimelineEvents,
    ]
  );

  return (
    <ProjectsContext.Provider value={projectsValue}>
      {children}
    </ProjectsContext.Provider>
  );
};








