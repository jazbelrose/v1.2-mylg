import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "@/app/contexts/useData";
import type { Project } from "@/app/contexts/DataProvider";
import { fetchTasks } from "@/shared/utils/api";
import { getColor } from "@/shared/utils/colorUtils";
import { getProjectDashboardPath } from "@/shared/utils/projectUrl";
import pLimit from "@/shared/utils/pLimit";
import { endOfWeek, startOfWeek } from "@/dashboard/home/utils/dateUtils";

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

type RawTask = {
  taskId?: string;
  id?: string;
  projectId?: string;
  title?: string;
  name?: string;
  status?: string;
  dueAt?: string | number | Date;
  due_at?: string | number | Date;
  dueDate?: string | number | Date;
  due_date?: string | number | Date;
  due?: string | number | Date;
  [key: string]: unknown;
};

type TaskStatus = "todo" | "in_progress" | "done" | string;

type NormalizedTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: Date | null;
  projectId: string;
  projectName: string;
  projectColor: string;
  dueKey?: string;
  timeLabel?: string;
};

export type TasksOverviewEvent = {
  id: string;
  title: string;
  time?: string;
  project?: string;
  color?: string;
};

export type TasksOverviewGroup = {
  id: string;
  dayLabel: string;
  items: TasksOverviewEvent[];
};

export type TasksOverviewStats = {
  completed: number;
  dueSoon: number;
  overdue: number;
};

function parseDueDate(value?: unknown): Date | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    const copy = new Date(value.getTime());
    return Number.isNaN(copy.getTime()) ? null : copy;
  }

  if (typeof value === "number") {
    const byNumber = new Date(value);
    return Number.isNaN(byNumber.getTime()) ? null : byNumber;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const iso = new Date(`${trimmed}T00:00:00`);
      return Number.isNaN(iso.getTime()) ? null : iso;
    }
  }

  return null;
}

function normalizeTitle(value?: unknown): string {
  if (typeof value !== "string") return "Untitled task";
  const trimmed = value.trim();
  if (!trimmed) return "Untitled task";

  if (trimmed === trimmed.toUpperCase()) {
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return trimmed;
}

function pickDue(raw: RawTask): { value: Date | null; key?: string; timeLabel?: string } {
  const candidate =
    raw.dueAt ?? raw.due_at ?? raw.dueDate ?? raw.due_date ?? raw.due ?? null;

  const dueDate = parseDueDate(candidate);
  if (!dueDate) {
    return { value: null, key: undefined, timeLabel: undefined };
  }

  const key = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(
    dueDate.getDate(),
  ).padStart(2, "0")}`;

  const rawString = typeof candidate === "string" ? candidate : undefined;
  const timeLabel = rawString && rawString.includes("T") ? timeFormatter.format(dueDate) : undefined;

  return { value: dueDate, key, timeLabel };
}

export function useTasksOverview() {
  const { projects = [] } = useData() as { projects: Project[] };
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<NormalizedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((project) => {
      if (project?.projectId) {
        map.set(project.projectId, project);
      }
    });
    return map;
  }, [projects]);

  useEffect(() => {
    let cancelled = false;
    const limit = pLimit(3);

    const load = async () => {
      if (!projects.length) {
        setTasks([]);
        setLoading(false);
        setError(false);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const results = await Promise.all(
          projects
            .filter((project) => project?.projectId)
            .map((project) =>
              limit(async () => {
                try {
                  const raw = await fetchTasks(project.projectId);
                  return (raw || []).map((task: RawTask, idx) => {
                    const { value: dueDate, key: dueKey, timeLabel } = pickDue(task);
                    const projectName = project.title || project.projectId;
                    const projectColor = project.color || getColor(project.projectId);
                    const id =
                      (task.taskId as string | undefined) ||
                      (task.id as string | undefined) ||
                      `${project.projectId}-${idx}`;

                    const status = typeof task.status === "string" ? task.status.toLowerCase() : "todo";
                    const title = normalizeTitle(task.title ?? task.name);

                    return {
                      id,
                      title,
                      status,
                      dueDate,
                      dueKey,
                      timeLabel,
                      projectId: project.projectId,
                      projectName,
                      projectColor,
                    } satisfies NormalizedTask;
                  });
                } catch (err) {
                  console.error("Failed to fetch tasks for project", project.projectId, err);
                  return [] as NormalizedTask[];
                }
              }),
            ),
        );

        if (cancelled) return;

        setTasks(results.flat());
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load tasks overview", err);
          setTasks([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [projects]);

  const { completed, dueSoon, overdue, groups, primaryProjectId } = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let completedCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    const groupMap = new Map<
      string,
      {
        id: string;
        label: string;
        date: Date;
        items: Array<TasksOverviewEvent & { due: Date }>;
      }
    >();

    tasks.forEach((task) => {
      if (!task.dueDate) {
        return;
      }

      const due = task.dueDate;
      const isDone = task.status === "done";

      if (isDone && due >= weekStart && due <= weekEnd) {
        completedCount += 1;
      }

      if (!isDone) {
        if (due < todayStart) {
          overdueCount += 1;
        } else if (due <= weekEnd) {
          dueSoonCount += 1;
        }
      }

      if (!isDone && due >= weekStart && due <= weekEnd) {
        const key = task.dueKey || `${due.getFullYear()}-${due.getMonth()}-${due.getDate()}`;
        let group = groupMap.get(key);
        if (!group) {
          group = {
            id: key,
            label: dayFormatter.format(due),
            date: due,
            items: [],
          };
          groupMap.set(key, group);
        }

        group.items.push({
          id: task.id,
          title: task.title,
          time: task.timeLabel,
          project: task.projectName,
          color: task.projectColor,
          due,
        });
      }
    });

    const sortedGroups: TasksOverviewGroup[] = Array.from(groupMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((group) => ({
        id: group.id,
        dayLabel: group.label,
        items: group.items
          .sort((a, b) => a.due.getTime() - b.due.getTime() || a.title.localeCompare(b.title))
          .map((item) => ({
            id: item.id,
            title: item.title,
            time: item.time,
            project: item.project,
            color: item.color,
          })),
      }));

    const sortedByUrgency = tasks
      .filter((task) => task.dueDate && task.status !== "done")
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });

    const primaryProjectId = sortedByUrgency[0]?.projectId ?? tasks[0]?.projectId ?? null;

    return {
      completed: completedCount,
      dueSoon: dueSoonCount,
      overdue: overdueCount,
      groups: sortedGroups,
      primaryProjectId,
    };
  }, [tasks]);

  const canNavigateToProject = Boolean(primaryProjectId && projectMap.has(primaryProjectId));

  const handleNavigateToPrimary = useCallback(() => {
    if (!primaryProjectId) {
      navigate("/dashboard/projects");
      return;
    }

    const project = projectMap.get(primaryProjectId);
    navigate(getProjectDashboardPath(primaryProjectId, project?.title));
  }, [navigate, primaryProjectId, projectMap]);

  const handleViewAll = useCallback(() => {
    navigate("/dashboard/projects");
  }, [navigate]);

  return {
    loading,
    error,
    stats: { completed, dueSoon, overdue } satisfies TasksOverviewStats,
    groups,
    handleNavigateToPrimary,
    handleViewAll,
    canNavigateToProject,
  };
}













