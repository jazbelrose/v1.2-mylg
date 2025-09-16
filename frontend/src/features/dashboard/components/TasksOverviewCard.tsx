import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal } from "lucide-react";

import { useData } from "@/app/contexts/useData";
import type { Project } from "@/app/contexts/DataProvider";
import { fetchTasks } from "@/shared/utils/api";
import { getColor } from "@/shared/utils/colorUtils";
import { slugify } from "@/shared/utils/slug";
import pLimit from "@/shared/utils/pLimit";
import Squircle from "@/shared/ui/Squircle";
import { endOfWeek, startOfWeek } from "@/features/dashboard/utils/dateUtils";

import styles from "./TasksOverviewCard.module.css";

const CARD_RADIUS = 24;

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

type EventChip = {
  id: string;
  title: string;
  time?: string;
  project?: string;
  color?: string;
};

type EventGroup = {
  id: string;
  dayLabel: string;
  items: EventChip[];
};

type TrimmedGroup = EventGroup & { hiddenItems: number };

type TasksOverviewCardProps = {
  className?: string;
  variant?: "default" | "compact";
  maxGroups?: number;
  maxItemsPerGroup?: number;
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

const TasksOverviewCard: React.FC<TasksOverviewCardProps> = ({
  className,
  variant = "default",
  maxGroups,
  maxItemsPerGroup,
}) => {
  const isCompact = variant === "compact";
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

  const projectSlugMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      if (project?.projectId) {
        const slug = slugify(project.title || project.projectId);
        map.set(project.projectId, slug);
      }
    });
    return map;
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
        items: Array<EventChip & { due: Date }>;
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

    const groups: EventGroup[] = Array.from(groupMap.values())
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
      groups,
      primaryProjectId,
    };
  }, [tasks]);

  const groupLimit = isCompact ? maxGroups ?? 2 : undefined;
  const itemsLimit = isCompact ? maxItemsPerGroup ?? 2 : undefined;

  const {
    visibleGroups,
    hiddenGroupsCount,
    hiddenTasksCount,
  }: {
    visibleGroups: TrimmedGroup[];
    hiddenGroupsCount: number;
    hiddenTasksCount: number;
  } = useMemo(() => {
    const limitGroups =
      typeof groupLimit === "number" ? Math.max(groupLimit, 0) : groups.length;
    const visibleSource = groups.slice(0, limitGroups);

    let hiddenTasks = 0;

    const mapped: TrimmedGroup[] = visibleSource.map((group) => {
      if (typeof itemsLimit !== "number") {
        return { ...group, hiddenItems: 0 };
      }
      const trimmedItems = group.items.slice(0, Math.max(itemsLimit, 0));
      const hidden = Math.max(0, group.items.length - trimmedItems.length);
      hiddenTasks += hidden;
      return { ...group, items: trimmedItems, hiddenItems: hidden };
    });

    const remainingGroups = groups.slice(visibleSource.length);
    hiddenTasks += remainingGroups.reduce((sum, group) => sum + group.items.length, 0);

    return {
      visibleGroups: mapped,
      hiddenGroupsCount: Math.max(0, groups.length - visibleSource.length),
      hiddenTasksCount: hiddenTasks,
    };
  }, [groups, groupLimit, itemsLimit]);

  const handleNavigateToPrimary = useCallback(() => {
    if (!primaryProjectId) {
      navigate("/dashboard/projects");
      return;
    }

    const slug = projectSlugMap.get(primaryProjectId) ?? primaryProjectId;
    navigate(`/dashboard/projects/${slug}`);
  }, [navigate, primaryProjectId, projectSlugMap]);

  const handleViewAll = useCallback(() => {
    navigate("/dashboard/projects");
  }, [navigate]);

  const canNavigateToProject = Boolean(primaryProjectId && projectMap.has(primaryProjectId));

  const formatStatValue = (value: number): string | number => {
    if (error) return "—";
    if (loading) return "…";
    return value;
  };

  const cardClassName = [
    styles.card,
    isCompact ? styles.cardCompact : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const headerClassName = [
    styles.header,
    isCompact ? styles.headerCompact : "",
  ]
    .filter(Boolean)
    .join(" ");

  const subtitleClassName = [
    styles.subtitle,
    isCompact ? styles.subtitleCompact : "",
  ]
    .filter(Boolean)
    .join(" ");

  const statGridClassName = [
    styles.statGrid,
    isCompact ? styles.statGridCompact : "",
  ]
    .filter(Boolean)
    .join(" ");

  const groupsClassName = [
    styles.groups,
    isCompact ? styles.groupsCompact : "",
  ]
    .filter(Boolean)
    .join(" ");

  const chipsClassName = [
    styles.chips,
    isCompact ? styles.chipsCompact : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Squircle
      as="section"
      radius={CARD_RADIUS}
      smoothing={0.6}
      className={cardClassName}
      aria-label="Tasks overview"
    >
      <header className={headerClassName}>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>Tasks</h3>
          <p className={subtitleClassName}>Track progress and deadlines across your projects.</p>
        </div>
        {!isCompact && (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.iconButtonPrimary}`}
              onClick={handleNavigateToPrimary}
              aria-label="Add or review tasks for the next project"
              disabled={!canNavigateToProject}
            >
              <Plus size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={handleViewAll}
              aria-label="View all projects"
            >
              <MoreHorizontal size={18} strokeWidth={2} />
            </button>
          </div>
        )}
      </header>

      <div className={statGridClassName}>
        <div
          className={`${styles.stat} ${isCompact ? styles.statCompact : ""} ${styles.statOk}`}
        >
          <span className={styles.statLabel}>Completed</span>
          <span className={`${styles.statValue} ${isCompact ? styles.statValueCompact : ""}`}>
            {formatStatValue(completed)}
          </span>
        </div>
        <div
          className={`${styles.stat} ${isCompact ? styles.statCompact : ""} ${styles.statDanger}`}
        >
          <span className={styles.statLabel}>Overdue</span>
          <span className={`${styles.statValue} ${isCompact ? styles.statValueCompact : ""}`}>
            {formatStatValue(overdue)}
          </span>
        </div>
        <div
          className={`${styles.stat} ${isCompact ? styles.statCompact : ""} ${styles.statWarn}`}
        >
          <span className={styles.statLabel}>Due</span>
          <span className={`${styles.statValue} ${isCompact ? styles.statValueCompact : ""}`}>
            {formatStatValue(dueSoon)}
          </span>
        </div>
      </div>

      {error ? (
        <div className={styles.empty}>We couldn’t load tasks right now. Please try again later.</div>
      ) : visibleGroups.length ? (
        <div className={groupsClassName}>
          {visibleGroups.map((group) => (
            <div key={group.id} className={`${styles.group} ${isCompact ? styles.groupCompact : ""}`}>
              <div className={`${styles.groupLabel} ${isCompact ? styles.groupLabelCompact : ""}`}>
                {group.dayLabel}
              </div>
              <div className={chipsClassName}>
                {group.items.map((item) => (
                  <div key={item.id} className={`${styles.chip} ${isCompact ? styles.chipCompact : ""}`}>
                    <span
                      className={styles.chipDot}
                      style={{ backgroundColor: item.color || "var(--brand, #fa3356)" }}
                      aria-hidden="true"
                    />
                    <span className={styles.chipTitle}>{item.title}</span>
                    {(item.time || item.project) && (
                      <span
                        className={`${styles.chipMeta} ${isCompact ? styles.chipMetaCompact : ""}`}
                      >
                        {item.time}
                        {item.time && item.project ? " · " : ""}
                        {item.project}
                      </span>
                    )}
                  </div>
                ))}
                {group.hiddenItems > 0 && (
                  <span className={styles.chipOverflow}>+{group.hiddenItems}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          {loading ? "Loading tasks…" : "No open tasks are due this week. You’re all caught up!"}
        </div>
      )}

      {isCompact &&
        !error &&
        !loading &&
        (hiddenGroupsCount > 0 || hiddenTasksCount > 0) && (
          <div className={styles.compactOverflow}>
            {hiddenGroupsCount > 0 && (
              <span>
                +{hiddenGroupsCount} more day{hiddenGroupsCount === 1 ? "" : "s"}
              </span>
            )}
            {hiddenGroupsCount > 0 && hiddenTasksCount > 0 && (
              <span className={styles.compactOverflowDot}>·</span>
            )}
            {hiddenTasksCount > 0 && (
              <span>
                +{hiddenTasksCount} task{hiddenTasksCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
    </Squircle>
  );
};

export default TasksOverviewCard;
