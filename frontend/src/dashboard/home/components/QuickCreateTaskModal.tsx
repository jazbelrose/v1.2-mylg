import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { NOMINATIM_SEARCH_URL, apiFetch, createTask } from "@/shared/utils/api";
import { useUser } from "@/app/contexts/useUser";

import styles from "./QuickCreateTaskModal.module.css";

type NominatimSuggestion = {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
};

type Coordinates = {
  lat: number;
  lng: number;
};

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOffsetDate(days: number): string {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + days);
  return toInputDate(base);
}

export type QuickCreateTaskModalProject = {
  id: string;
  name: string;
};

export type QuickCreateTaskModalProps = {
  open: boolean;
  onClose: () => void;
  projects: QuickCreateTaskModalProject[];
  onCreated: () => void;
  activeProjectId?: string | null;
  activeProjectName?: string | null;
  scopedProjectId?: string | null;
};

const QuickCreateTaskModal: React.FC<QuickCreateTaskModalProps> = ({
  open,
  onClose,
  projects,
  onCreated,
  activeProjectId,
  activeProjectName,
  scopedProjectId,
}) => {
  const { userData, allUsers } = useUser();
  const [projectId, setProjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [addressSearch, setAddressSearch] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<NominatimSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const suggestionsListId = "quick-create-task-location-suggestions";
  const touchStartYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const lastOffsetRef = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const descriptionId = useId();
  const projectFieldId = useId();
  const assigneeFieldId = useId();
  const taskNameFieldId = useId();
  const titleCounterId = useId();
  const titleErrorId = useId();
  const projectErrorId = useId();
  const locationFieldId = useId();
  const dueDateFieldId = useId();
  const notesFieldId = useId();
  const feedbackRegionId = useId();
  const locationHintId = useId();

  const projectOptions = useMemo(() => projects ?? [], [projects]);
  const hasProjects = projectOptions.length > 0;
  const resolvedActiveProjectName = useMemo(() => {
    if (activeProjectName && activeProjectName.trim()) {
      return activeProjectName.trim();
    }

    const targetId = activeProjectId || scopedProjectId || projectId;
    if (!targetId) return "";
    const found = projectOptions.find((project) => project.id === targetId);
    return found?.name ?? "";
  }, [activeProjectId, activeProjectName, projectId, projectOptions, scopedProjectId]);
  const collaboratorIds = useMemo(
    () =>
      Array.isArray(userData?.collaborators)
        ? userData.collaborators.filter(
            (id): id is string => typeof id === "string" && id.trim().length > 0
          )
        : [],
    [userData?.collaborators]
  );

  const collaboratorOptions = useMemo(() => {
    if (!collaboratorIds.length) return [] as { value: string; label: string }[];
    return collaboratorIds
      .map((id) => {
        const collaborator = allUsers.find((user) => user.userId === id);
        const first = collaborator?.firstName?.trim() ?? "";
        const last = collaborator?.lastName?.trim() ?? "";
        const fullName = `${first} ${last}`.trim();
        const label =
          fullName || collaborator?.username || collaborator?.email || collaborator?.userId || id;
        return { value: id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [allUsers, collaboratorIds]);

  const hasCollaborators = collaboratorOptions.length > 0;
  const effectiveProjectId = useMemo(() => {
    if (scopedProjectId) {
      return scopedProjectId;
    }

    if (projectId && projectOptions.some((project) => project.id === projectId)) {
      return projectId;
    }

    return projectOptions[0]?.id ?? "";
  }, [projectId, projectOptions, scopedProjectId]);
  const trimmedTitle = title.trim();
  const titleRemaining = 120 - title.length;
  const showTitleCounter = titleRemaining <= 20;
  const canSubmit = Boolean(effectiveProjectId && trimmedTitle);

  const sortSuggestionsByProximity = useCallback(
    (suggestions: NominatimSuggestion[], origin: Coordinates | null) => {
      if (!origin) return suggestions;
      return [...suggestions].sort((a, b) => {
        const distanceA = Math.hypot(origin.lat - parseFloat(a.lat), origin.lng - parseFloat(a.lon));
        const distanceB = Math.hypot(origin.lat - parseFloat(b.lat), origin.lng - parseFloat(b.lon));
        return distanceA - distanceB;
      });
    },
    []
  );

  const fetchAddressSuggestions = useCallback(
    async (query: string) => {
      if (!query || query.length < 3) {
        setAddressSuggestions([]);
        return;
      }

      try {
        const url = `${NOMINATIM_SEARCH_URL}${encodeURIComponent(query)}&addressdetails=1&limit=5`;
        const results = await apiFetch<NominatimSuggestion[]>(url);
        setAddressSuggestions(sortSuggestionsByProximity(results ?? [], userLocation));
      } catch (error) {
        console.error("Failed to fetch address suggestions", error);
        setAddressSuggestions([]);
      }
    },
    [sortSuggestionsByProximity, userLocation]
  );

  const resetForm = useCallback(() => {
    setProjectId("");
    setTitle("");
    setDescription("");
    setDueDate("");
    setAddressSearch("");
    setAddressSuggestions([]);
    setSelectedLocation(null);
    setAssigneeId("");
    setSubmitting(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTitleError(null);
    setProjectError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
      setSwipeOffset(0);
      setIsDragging(false);
      isDraggingRef.current = false;
      touchStartYRef.current = null;
      lastOffsetRef.current = 0;
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setTitleError(null);
    setProjectError(null);

    if (scopedProjectId) {
      setProjectId(scopedProjectId);
      return;
    }

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
  }, [open, projectOptions, resetForm, scopedProjectId]);

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

  useEffect(() => {
    if (!open) return;

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setUserLocation(null);
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      () => {
        if (!cancelled) {
          setUserLocation(null);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!userLocation) return;
    setAddressSuggestions((prev) => sortSuggestionsByProximity(prev, userLocation));
  }, [sortSuggestionsByProximity, userLocation]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const { style } = document.body;
    const previousOverflow = style.overflow;
    style.overflow = "hidden";

    return () => {
      style.overflow = previousOverflow;
    };
  }, [open]);

  const resizeNotes = useCallback(() => {
    const textarea = notesRef.current;
    if (!textarea) return;

    const lineHeight = 24;
    const minHeight = lineHeight * 4;
    const maxHeight = lineHeight * 6;
    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      titleInputRef.current?.focus({ preventScroll: true });
      resizeNotes();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [open, resizeNotes]);

  useEffect(() => {
    resizeNotes();
  }, [description, resizeNotes]);

  useEffect(() => {
    if (!open) return;
    const handleMetaEnter = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (!submitting && canSubmit) {
          formRef.current?.requestSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleMetaEnter);
    return () => window.removeEventListener("keydown", handleMetaEnter);
  }, [canSubmit, open, submitting]);

  useEffect(() => {
    if (!open) return;
    const modal = modalRef.current;
    if (!modal) return;

    const selectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(selectors)).filter(
        (element) =>
          (element.offsetParent !== null || element.getClientRects().length > 0) &&
          !element.hasAttribute("data-focus-guard")
      );

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first || !modal.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    modal.addEventListener("keydown", handleTabKey);
    return () => modal.removeEventListener("keydown", handleTabKey);
  }, [open]);

  useEffect(() => {
    if (trimmedTitle) {
      setTitleError(null);
    }
  }, [trimmedTitle]);

  useEffect(() => {
    if (effectiveProjectId) {
      setProjectError(null);
    }
  }, [effectiveProjectId]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const descriptionCopy = activeProjectId
    ? `Launch work for ${resolvedActiveProjectName || "this project"}.`
    : "Launch work for any project without leaving this view.";
  const showProjectSelect = !scopedProjectId && hasProjects;
  const todayValue = getOffsetDate(0);
  const tomorrowValue = getOffsetDate(1);
  const nextWeekValue = getOffsetDate(7);
  const isSubmitDisabled = submitting || !canSubmit;
  const taskNameDescribedBy = [
    showTitleCounter ? titleCounterId : null,
    titleError ? titleErrorId : null,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || undefined;
  const projectDescribedBy = projectError ? projectErrorId : undefined;
  const locationDescribedBy = selectedLocation ? locationHintId : undefined;

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (submitting) return;
    if (event.touches.length !== 1) return;

    touchStartYRef.current = event.touches[0].clientY;
    isDraggingRef.current = true;
    lastOffsetRef.current = 0;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || touchStartYRef.current === null) return;

    const currentY = event.touches[0].clientY;
    const delta = currentY - touchStartYRef.current;
    const offset = delta > 0 ? delta : 0;
    lastOffsetRef.current = offset;
    setSwipeOffset(offset);
    
    // Always prevent default to avoid scrolling interference when dragging
    if (offset > 0) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;

    const threshold = 140;
    const shouldClose = lastOffsetRef.current > threshold && !submitting;

    if (shouldClose) {
      setSwipeOffset(0);
      onClose();
    } else {
      setSwipeOffset(0);
    }

    isDraggingRef.current = false;
    touchStartYRef.current = null;
    lastOffsetRef.current = 0;
    setIsDragging(false);
  };

  const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !submitting) {
      onClose();
    }
  };

  const handleFormBodyClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    // If clicked outside of input/textarea/select elements, blur the active element to dismiss keyboard
    if (!target.closest('input, textarea, select, button')) {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
    }
  };

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAddressSearch(value);
    setSelectedLocation(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    void fetchAddressSuggestions(value);
  };

  const handleAddressSuggestionSelect = (suggestion: NominatimSuggestion) => {
    const coords = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
    setSelectedLocation(coords);
    setAddressSearch(suggestion.display_name);
    setAddressSuggestions([]);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setProjectId(event.target.value);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleAssigneeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setAssigneeId(event.target.value);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleDueDateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDueDate(event.target.value);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleDueDateQuickSelect = (value: string) => {
    setDueDate(value);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleDescriptionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.target.value);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!effectiveProjectId) {
      setProjectError("Add a project before creating tasks.");
      setErrorMessage(null);
      return;
    }

    if (!trimmedTitle) {
      setTitleError("Give the task a name before saving.");
      setErrorMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    let dueDateIso: string | undefined;
    if (dueDate) {
      const parsed = new Date(`${dueDate}T00:00:00`);
      dueDateIso = Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }

    try {
      const trimmedAddress = addressSearch.trim();
      const locationPayload = selectedLocation
        ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
        : undefined;

      await createTask({
        projectId: effectiveProjectId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        dueDate: dueDateIso,
        status: "todo",
        ...(assigneeId ? { assigneeId } : {}),
        ...(trimmedAddress ? { address: trimmedAddress } : {}),
        ...(locationPayload ? { location: locationPayload } : {}),
      });
      setSuccessMessage("Task created. You'll see it in your lists shortly.");
      setTitle("");
      setDescription("");
      setDueDate("");
      setAddressSearch("");
      setAddressSuggestions([]);
      setSelectedLocation(null);
      setAssigneeId("");
      setTitleError(null);
      setProjectError(null);
      onCreated();
      requestAnimationFrame(() => {
        titleInputRef.current?.focus({ preventScroll: true });
      });
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
        ref={modalRef}
        className={`${styles.createModal} ${isDragging ? styles.createModalDragging : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-task-title"
        aria-describedby={descriptionId}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        style={swipeOffset ? { transform: `translateY(${swipeOffset}px)` } : undefined}
      >
        <div 
          className={styles.grabZone}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className={styles.grabHandle} />
        </div>
        <form
          ref={formRef}
          className={styles.createForm}
          onSubmit={handleSubmit}
          aria-describedby={feedbackRegionId}
          noValidate
        >
          <div className={styles.formBody} onClick={handleFormBodyClick}>
            <div className={styles.createHeader}>
              <h2 id="quick-task-title">Create a task</h2>
              <p id={descriptionId} className={styles.createDescription}>
                {descriptionCopy}
              </p>
            </div>
            {showProjectSelect ? (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor={projectFieldId}>
                  <span className={styles.fieldLabelText}>Project</span>
                </label>
                <select
                  id={projectFieldId}
                  aria-label="Project"
                  className={styles.selectInput}
                  value={projectId}
                  onChange={handleProjectChange}
                  disabled={!hasProjects || submitting}
                  aria-describedby={projectDescribedBy}
                >
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {projectError ? (
                  <p id={projectErrorId} className={styles.fieldError} aria-live="polite">
                    {projectError}
                  </p>
                ) : null}
              </div>
            ) : null}
            {!hasProjects && !scopedProjectId ? (
              <p className={styles.helperText}>Add a project to start creating tasks.</p>
            ) : null}
            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeader}>
                <label className={styles.fieldLabel} htmlFor={assigneeFieldId}>
                  <span className={styles.fieldLabelText}>Assign to</span>
                </label>
                <span className={styles.fieldOptional}>Optional</span>
              </div>
              <select
                id={assigneeFieldId}
                aria-label="Assign task"
                className={styles.selectInput}
                value={assigneeId}
                onChange={handleAssigneeChange}
                disabled={submitting}
              >
                <option value="">Unassigned</option>
                {collaboratorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {!hasCollaborators ? (
              <p className={styles.helperText}>Invite collaborators to assign tasks.</p>
            ) : null}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor={taskNameFieldId}>
                <span className={styles.fieldLabelText}>Task name</span>
              </label>
              <input
                id={taskNameFieldId}
                aria-label="Task name"
                type="text"
                className={styles.textInput}
                value={title}
                onChange={handleTitleChange}
                placeholder="What needs to get done?"
                disabled={submitting}
                ref={titleInputRef}
                aria-describedby={taskNameDescribedBy}
              />
              {showTitleCounter ? (
                <span id={titleCounterId} className={styles.fieldMeta}>
                  {titleRemaining >= 0
                    ? `${titleRemaining} characters remaining`
                    : `${Math.abs(titleRemaining)} characters over recommended length`}
                </span>
              ) : null}
              {titleError ? (
                <p id={titleErrorId} className={styles.fieldError} aria-live="polite">
                  {titleError}
                </p>
              ) : null}
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeader}>
                <label className={styles.fieldLabel} htmlFor={locationFieldId}>
                  <span className={styles.fieldLabelText}>Location</span>
                </label>
                <span className={styles.fieldOptional}>Optional</span>
              </div>
              <div className={styles.locationInputWrapper}>
                <input
                  id={locationFieldId}
                  aria-label="Task location"
                  type="text"
                  className={styles.textInput}
                  value={addressSearch}
                  onChange={handleAddressChange}
                  placeholder="Search for an address or venue"
                  disabled={submitting}
                  aria-autocomplete="list"
                  aria-expanded={addressSuggestions.length > 0}
                  aria-controls={addressSuggestions.length > 0 ? suggestionsListId : undefined}
                  aria-describedby={locationDescribedBy}
                />
                {addressSuggestions.length > 0 ? (
                  <div className={styles.locationSuggestions} role="listbox" id={suggestionsListId}>
                    {addressSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.place_id}
                        type="button"
                        className={styles.locationSuggestionButton}
                        role="option"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleAddressSuggestionSelect(suggestion)}
                      >
                        {suggestion.display_name}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {selectedLocation ? (
                <span id={locationHintId} className={styles.fieldMeta}>
                  Saved coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </span>
              ) : null}
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeader}>
                <label className={styles.fieldLabel} htmlFor={dueDateFieldId}>
                  <span className={styles.fieldLabelText}>Due date</span>
                </label>
                <span className={styles.fieldOptional}>Optional</span>
              </div>
              <input
                id={dueDateFieldId}
                aria-label="Task due date"
                type="date"
                className={styles.textInput}
                value={dueDate}
                onChange={handleDueDateInputChange}
                disabled={submitting}
              />
              <div className={styles.quickChips} role="group" aria-label="Quick due date shortcuts">
                <button
                  type="button"
                  className={`${styles.quickChip} ${dueDate === todayValue ? styles.quickChipActive : ""}`}
                  onClick={() => handleDueDateQuickSelect(todayValue)}
                  disabled={submitting}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`${styles.quickChip} ${dueDate === tomorrowValue ? styles.quickChipActive : ""}`}
                  onClick={() => handleDueDateQuickSelect(tomorrowValue)}
                  disabled={submitting}
                >
                  +1
                </button>
                <button
                  type="button"
                  className={`${styles.quickChip} ${dueDate === nextWeekValue ? styles.quickChipActive : ""}`}
                  onClick={() => handleDueDateQuickSelect(nextWeekValue)}
                  disabled={submitting}
                >
                  +7
                </button>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeader}>
                <label className={styles.fieldLabel} htmlFor={notesFieldId}>
                  <span className={styles.fieldLabelText}>Notes</span>
                </label>
                <span className={styles.fieldOptional}>Optional</span>
              </div>
              <textarea
                id={notesFieldId}
                aria-label="Task notes"
                className={styles.textarea}
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Add context or links."
                disabled={submitting}
                rows={4}
                ref={notesRef}
              />
            </div>
            <div id={feedbackRegionId} className={styles.feedbackRegion} aria-live="polite">
              {errorMessage ? (
                <div className={`${styles.feedback} ${styles.feedbackError}`}>{errorMessage}</div>
              ) : null}
              {successMessage ? (
                <div className={`${styles.feedback} ${styles.feedbackSuccess}`}>{successMessage}</div>
              ) : null}
            </div>
            <div className={styles.actionBar}>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitDisabled}
              >
                {submitting ? <span className={styles.spinner} aria-hidden="true" /> : null}
                <span>Save task</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default QuickCreateTaskModal;
