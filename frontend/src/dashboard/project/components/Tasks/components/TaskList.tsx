import React from "react";
import { Calendar, MapPin, User } from "lucide-react";

import styles from "../TasksComponentMobile.module.css";
import { buildDirectionsLinks, formatAssigneeDisplay } from "../utils";
import {
  createTaskStatusContext,
  getTaskStatusBadge,
  getTaskStatusTone,
  type TaskStatusTone,
} from "./quickTaskUtils";
import type { QuickTask } from "./taskTypes";

type TaskListProps = {
  tasks: QuickTask[];
  activeTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
  formatDueLabel: (task: QuickTask) => string;
  taskListRef: React.RefObject<HTMLUListElement>;
};

const BADGE_CLASS_BY_TONE: Record<TaskStatusTone, string> = {
  success: "statusBadgeSuccess",
  danger: "statusBadgeDanger",
  warning: "statusBadgeWarning",
  neutral: "statusBadgeNeutral",
};

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  activeTaskId,
  onTaskSelect,
  formatDueLabel,
  taskListRef,
}) => {
  const statusContext = createTaskStatusContext();

  return (
    <ul className={styles.taskList} ref={taskListRef}>
      {tasks.map((task) => {
        const isActive = task.id === activeTaskId;
        const assigneeLabel = formatAssigneeDisplay(task.assignedTo);
        const listItemClassName = `${styles.taskItem}${isActive ? ` ${styles.taskItemActive}` : ""}`;

        const directionsLinks = buildDirectionsLinks(task.address);
        const { category, label } = getTaskStatusBadge(task.status, task.dueDate, statusContext);
        const tone = getTaskStatusTone(category);
        const badgeClassKey = BADGE_CLASS_BY_TONE[tone];
        const badgeToneClass = badgeClassKey ? styles[badgeClassKey as keyof typeof styles] : undefined;
        const badgeClassName = [styles.statusBadge, badgeToneClass].filter(Boolean).join(" ");

        return (
          <li key={task.id} data-task-id={task.id} className={listItemClassName}>
            <div
              role="button"
              tabIndex={0}
              className={styles.taskButton}
              onClick={() => onTaskSelect(task.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onTaskSelect(task.id);
                }
              }}
            >
              <div className={styles.taskTitleRow}>
                <span className={styles.taskTitle}>{task.title}</span>
                <span className={badgeClassName}>{label}</span>
              </div>
              <div className={styles.taskMeta}>
                <span className={styles.metaLine}>
                  <Calendar size={14} aria-hidden="true" /> {formatDueLabel(task)}
                </span>
                {task.address ? (
                  <span className={`${styles.metaLine} ${styles.metaLineAddress}`}>
                    <MapPin size={14} aria-hidden="true" />
                    <span className={styles.addressDetails}>
                      <span className={styles.addressText}>{task.address}</span>
                      {directionsLinks ? (
                        <span className={styles.addressActions}>
                          <a
                            href={directionsLinks.appleMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.addressLink}
                            onClick={(event) => event.stopPropagation()}
                          >
                            Open in Maps
                          </a>
                          <span className={styles.addressLinkSeparator} aria-hidden="true">
                            •
                          </span>
                          <a
                            href={directionsLinks.googleMaps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.addressLink}
                            onClick={(event) => event.stopPropagation()}
                          >
                            Open in Google Maps
                          </a>
                        </span>
                      ) : null}
                    </span>
                  </span>
                ) : (
                  <span className={`${styles.metaLine} ${styles.metaLineMuted}`}>
                    <MapPin size={14} aria-hidden="true" /> No location
                  </span>
                )}
                {assigneeLabel ? (
                  <span className={styles.metaLine}>
                    <User size={14} aria-hidden="true" /> Assigned to : {assigneeLabel}
                  </span>
                ) : (
                  <span className={`${styles.metaLine} ${styles.metaLineMuted}`}>
                    <User size={14} aria-hidden="true" /> No assignee
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default TaskList;
