import React from "react";
import { Calendar, MapPin, User } from "lucide-react";

import styles from "../TasksComponentMobile.module.css";
import { formatAssigneeDisplay } from "../utils";
import type { QuickTask } from "./taskTypes";

type TaskListProps = {
  tasks: QuickTask[];
  activeTaskId: string | null;
  onTaskSelect: (taskId: string) => void;
  formatDueLabel: (task: QuickTask) => string;
  taskListRef: React.RefObject<HTMLUListElement>;
};

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  activeTaskId,
  onTaskSelect,
  formatDueLabel,
  taskListRef,
}) => (
  <ul className={styles.taskList} ref={taskListRef}>
    {tasks.map((task) => {
      const isActive = task.id === activeTaskId;
      const assigneeLabel = formatAssigneeDisplay(task.assignedTo);
      const listItemClassName = `${styles.taskItem}${isActive ? ` ${styles.taskItemActive}` : ""}`;

      return (
        <li key={task.id} data-task-id={task.id} className={listItemClassName}>
          <button type="button" className={styles.taskButton} onClick={() => onTaskSelect(task.id)}>
            <div className={styles.taskTitleRow}>
              <span className={styles.taskTitle}>{task.title}</span>
              <span className={styles.statusBadge}>
                {task.status === "done" ? "Completed" : task.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className={styles.taskMeta}>
              <span className={styles.metaLine}>
                <Calendar size={14} aria-hidden="true" /> {formatDueLabel(task)}
              </span>
              {task.address ? (
                <span className={styles.metaLine}>
                  <MapPin size={14} aria-hidden="true" /> {task.address}
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
          </button>
        </li>
      );
    })}
  </ul>
);

export default TaskList;
