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

export const ProjectsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { userId } = useAuth();

  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(false);
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

        setProjects(withIds);
        setUserProjects(withIds);
      } catch (error) {
        console.error("Error fetching projects:", error);
        setProjectsError(true);
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
        return;
      }
      let project = projects.find((p) => p.projectId === projectId);

      if (
        !project ||
        !Array.isArray(project.team) ||
        project.description === undefined
      ) {
        try {
          const fetched = (await fetchProjectById(projectId)) as Project | undefined;
          if (fetched) {
            try {
              const events = (await fetchEvents(projectId)) as TimelineEvent[];
              project = { ...fetched, timelineEvents: events };
            } catch (err) {
              console.error("Failed to fetch events", err);
              project = { ...fetched, timelineEvents: [] };
            }

            setProjects((prev) => {
              if (!Array.isArray(prev)) return prev;
              const idx = prev.findIndex((p) => p.projectId === projectId);
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = project as Project;
                return updated;
              }
              return [...prev, project as Project];
            });
          }
        } catch (err) {
          console.error("Error fetching project details", err);
        }
      } else if (!Array.isArray(project.timelineEvents)) {
        try {
          const events = (await fetchEvents(projectId)) as TimelineEvent[];
          project = { ...project, timelineEvents: events };
        } catch (err) {
          console.error("Failed to fetch events", err);
          project = { ...project, timelineEvents: [] };
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
      } else {
        console.error(`Project with projectId: ${projectId} not found`);
        setActiveProject(null);
      }
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
      const merge = (project?: Project | null) => {
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
        return updated;
      };

      setActiveProject((prev) => merge(prev) ?? prev);
      setProjects((prev) => (Array.isArray(prev) ? prev.map((p) => merge(p)!) : prev));
      setUserProjects((prev) => (Array.isArray(prev) ? prev.map((p) => merge(p)!) : prev));
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
      updateTimelineEvents,
    ]
  );

  return (
    <ProjectsContext.Provider value={projectsValue}>
      {children}
    </ProjectsContext.Provider>
  );
};