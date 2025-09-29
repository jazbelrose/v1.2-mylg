import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { createTask } from "@/shared/utils/api";

import styles from "./QuickCreateTaskModal.module.css";

export type QuickCreateTaskModalProject = {
  id: string;
  name: string;
};

export type QuickCreateTaskModalProps = {
  open: boolean;
  onClose: () => void;
  projects: QuickCreateTaskModalProject[];
  onCreated: () => void;
};

const QuickCreateTaskModal: React.FC<QuickCreateTaskModalProps> = ({
  open,
  onClose,
  projects,
  onCreated,
}) => {
  const [projectId, setProjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const projectOptions = useMemo(() => projects ?? [], [projects]);

  const resetForm = useCallback(() => {
    setProjectId("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setSubmitting(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!projectOptions.length) {
      setProjectId("");
      return;
    }

    setProjectId((current) => {
      if (current && projectOptions.some((project) => project.id === current)) {
        return current;
      }
      return projectOptions[0].id;
    });
  }, [open, projectOptions, resetForm]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!submitting) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, submitting]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const hasProjects = projectOptions.length > 0;

  const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !submitting) {
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const targetProjectId = projectId || projectOptions[0]?.id || "";
    if (!targetProjectId) {
      setErrorMessage("Add a project before creating tasks.");
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage("Give the task a name before saving.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    let dueDateIso: string | undefined;
    if (dueDate) {
      const parsed = new Date(`${dueDate}T00:00:00`);
      dueDateIso = Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }

    try {
      await createTask({
        projectId: targetProjectId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        dueDate: dueDateIso,
        status: "todo",
      });
      setSuccessMessage("Task created. You'll see it in your lists shortly.");
      setTitle("");
      setDescription("");
      setDueDate("");
      onCreated();
    } catch (error) {
      console.error("Failed to create task", error);
      setErrorMessage("We couldn't create that task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={styles.createOverlay} role="presentation" onMouseDown={handleOverlayMouseDown}>
      <div
        className={styles.createModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-task-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.createHeader}>
          <h2 id="quick-task-title">Create a task</h2>
          <p className={styles.createDescription}>
            Launch work for any project on your radar without leaving this view.
          </p>
        </div>
        <form className={styles.createForm} onSubmit={handleSubmit}>
          <label className={styles.fieldLabel}>
            Project
            <select
              className={styles.selectInput}
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={!hasProjects || submitting}
            >
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          {!hasProjects ? (
            <p className={styles.emptyProjects}>Add a project to start creating tasks.</p>
          ) : null}
          <label className={styles.fieldLabel}>
            Task name
            <input
              type="text"
              className={styles.textInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to get done?"
              disabled={submitting}
            />
          </label>
          <label className={styles.fieldLabel}>
            Due date <span className={styles.fieldOptional}>(optional)</span>
            <input
              type="date"
              className={styles.textInput}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={submitting}
            />
          </label>
          <label className={styles.fieldLabel}>
            Notes <span className={styles.fieldOptional}>(optional)</span>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Add context or links."
              disabled={submitting}
            />
          </label>
          {errorMessage ? (
            <div className={`${styles.feedback} ${styles.feedbackError}`}>{errorMessage}</div>
          ) : null}
          {successMessage ? (
            <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>{successMessage}</div>
          ) : null}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!hasProjects || submitting}
            >
              Save task
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default QuickCreateTaskModal;
