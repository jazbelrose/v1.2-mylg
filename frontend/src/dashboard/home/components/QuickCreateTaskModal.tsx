import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  NOMINATIM_SEARCH_URL,
  apiFetch,
  createTask,
  fetchTasks,
  updateTask,
  deleteTask,
} from "@/shared/utils/api";
import type { Task } from "@/shared/utils/api";
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

type ModalTask = Task & {
  id?: string;
  name?: string;
  comments?: string;
  address?: string;
  location?: Coordinates | null;
};

const taskDueDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const allowedStatuses: Task["status"][] = ["todo", "in_progress", "done"];

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInputValue(value: string | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return toInputDate(parsed);
}

function parseLocation(raw: unknown): Coordinates | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const latValue = (raw as { lat?: unknown }).lat;
  const lngValue = (raw as { lng?: unknown }).lng;
  const lat = typeof latValue === "number" || typeof latValue === "string" ? Number(latValue) : NaN;
  const lng = typeof lngValue === "number" || typeof lngValue === "string" ? Number(lngValue) : NaN;
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return undefined;
  }
  return { lat, lng };
}

function normalizeTask(task: Partial<ModalTask>, fallbackProjectId: string): ModalTask {
  const projectId =
    typeof task.projectId === "string" && task.projectId.trim()
      ? task.projectId.trim()
      : fallbackProjectId;

  const rawTitle =
    typeof task.title === "string" && task.title.trim()
      ? task.title.trim()
      : typeof task.name === "string" && task.name.trim()
      ? task.name.trim()
      : "Untitled task";

  const description =
    typeof task.description === "string"
      ? task.description
      : typeof task.comments === "string"
      ? task.comments
      : undefined;

  const rawStatus = typeof task.status === "string" ? task.status : undefined;
  const normalizedStatus =
    rawStatus && allowedStatuses.includes(rawStatus as Task["status"])
      ? (rawStatus as Task["status"])
      : task.status || "todo";

  const dueDate = typeof task.dueDate === "string" && task.dueDate.trim() ? task.dueDate : undefined;

  const assigneeId =
    typeof task.assigneeId === "string" && task.assigneeId.trim() ? task.assigneeId.trim() : undefined;

  const address =
    typeof task.address === "string" && task.address.trim() ? task.address.trim() : undefined;

  const location = parseLocation((task as { location?: unknown }).location);

  const identifier =
    typeof task.taskId === "string" && task.taskId.trim()
      ? task.taskId.trim()
      : typeof task.id === "string" && task.id.trim()
      ? task.id.trim()
      : undefined;

  return {
    projectId,
    title: rawTitle,
    description,
    dueDate,
    status: normalizedStatus,
    assigneeId,
    taskId: identifier,
    id: identifier || `${projectId || "task"}-${rawTitle}`,
    address,
    location,
  };
}

function getTaskIdentifier(task: ModalTask | null | undefined): string | undefined {
  if (!task) return undefined;
  if (typeof task.taskId === "string" && task.taskId.trim()) {
    return task.taskId.trim();
  }
  if (typeof task.id === "string" && task.id.trim()) {
    return task.id.trim();
  }
  return undefined;
}

function formatTaskMeta(task: ModalTask): string {
  const statusLabelMap: Record<string, string> = {
    todo: "To do",
    in_progress: "In progress",
    done: "Done",
  };

  const parts: string[] = [];

  if (task.status && statusLabelMap[task.status]) {
    parts.push(statusLabelMap[task.status] ?? task.status);
  }

  if (task.dueDate) {
    const parsed = new Date(task.dueDate);
    if (!Number.isNaN(parsed.getTime())) {
      parts.push(`Due ${taskDueDateFormatter.format(parsed)}`);
    }
  } else {
    parts.push("No due date");
  }

  return parts.join(" · ");
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
  const [taskList, setTaskList] = useState<ModalTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<ModalTask | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
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

    const findCollaborator = (rawId: string) => {
      const trimmedId = rawId.trim();
      if (!trimmedId) return undefined;
      const [, extractedId] = trimmedId.includes("__") ? trimmedId.split("__") : [null, null];
      const normalizedId = extractedId?.trim() || trimmedId;
      return allUsers.find((user) => {
        const userId = user.userId?.trim();
        const username = user.username?.trim();
        const compactName = `${user.firstName?.trim() ?? ""}${user.lastName?.trim() ?? ""}`;
        return (
          (userId && userId === normalizedId) ||
          (userId && userId === trimmedId) ||
          (username && username === trimmedId) ||
          (compactName && compactName === trimmedId)
        );
      });
    };

    const formatLabel = (collaborator: (typeof allUsers)[number] | undefined, fallbackId: string) => {
      const first = collaborator?.firstName?.trim() ?? "";
      const last = collaborator?.lastName?.trim() ?? "";
      const fullName = `${first} ${last}`.trim();
      return (
        fullName ||
        collaborator?.username?.trim() ||
        collaborator?.email?.trim() ||
        collaborator?.userId?.trim() ||
        fallbackId
      );
    };

    const formatValue = (collaborator: (typeof allUsers)[number] | undefined, fallbackId: string) => {
      if (!collaborator) return fallbackId;
      const existingParts = fallbackId.includes("__") ? fallbackId.split("__") : [];
      const fallbackUserId = existingParts[1]?.trim();
      const userId = collaborator.userId?.trim() || fallbackUserId;
      if (!userId) return fallbackId;
      const compactFirst = collaborator.firstName?.trim() ?? "";
      const compactLast = collaborator.lastName?.trim() ?? "";
      const compactName = `${compactFirst}${compactLast}`.replace(/\s+/g, "");
      const fallbackName =
        compactName ||
        collaborator.username?.replace(/\s+/g, "") ||
        existingParts[0]?.replace(/\s+/g, "") ||
        fallbackId.replace(/\s+/g, "");
      const safeName = fallbackName || "User";
      return `${safeName}__${userId}`;
    };

    const dedupeMap = new Map<string, { value: string; label: string }>();

    collaboratorIds.forEach((rawId) => {
      const collaborator = findCollaborator(rawId);
      const value = formatValue(collaborator, rawId);
      const label = formatLabel(collaborator, rawId);
      if (!dedupeMap.has(value)) {
        dedupeMap.set(value, { value, label });
      }
    });

    return Array.from(dedupeMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );
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
  const targetProjectIdForSubmit = editingTask?.projectId || effectiveProjectId;
  const canSubmit = Boolean(targetProjectIdForSubmit && trimmedTitle);
  const isEditing = Boolean(editingTask);

  const sortedTasks = useMemo(() => {
    return [...taskList].sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const safeDateA = Number.isNaN(dateA) ? Number.POSITIVE_INFINITY : dateA;
      const safeDateB = Number.isNaN(dateB) ? Number.POSITIVE_INFINITY : dateB;
      if (safeDateA === safeDateB) {
        return (a.title || "").localeCompare(b.title || "");
      }
      return safeDateA - safeDateB;
    });
  }, [taskList]);

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

  const clearFormFields = useCallback(() => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setAddressSearch("");
    setAddressSuggestions([]);
    setSelectedLocation(null);
    setAssigneeId("");
    setTitleError(null);
    setProjectError(null);
  }, []);

  const resetForm = useCallback(() => {
    setProjectId("");
    clearFormFields();
    setSubmitting(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTitleError(null);
    setProjectError(null);
    setTaskList([]);
    setTasksLoading(false);
    setTasksError(null);
    setEditingTask(null);
    setDeletingTaskId(null);
  }, [clearFormFields]);

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
    if (effectiveProjectId || editingTask?.projectId) {
      setProjectError(null);
    }
  }, [effectiveProjectId, editingTask?.projectId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!effectiveProjectId) {
      setTaskList([]);
      setEditingTask(null);
      clearFormFields();
      setSuccessMessage(null);
      setErrorMessage(null);
      setTasksLoading(false);
      setTasksError(null);
      return;
    }

    let cancelled = false;
    setTasksLoading(true);
    setTasksError(null);
    setEditingTask(null);
    clearFormFields();
    setSuccessMessage(null);
    setErrorMessage(null);

    (async () => {
      try {
        const tasks = await fetchTasks(effectiveProjectId);
        if (cancelled) return;
        const normalized = Array.isArray(tasks)
          ? tasks.map((task) => normalizeTask(task as ModalTask, effectiveProjectId))
          : [];
        setTaskList(normalized);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load tasks", error);
          setTasksError("We couldn't load the task list. Try again in a moment.");
          setTaskList([]);
        }
      } finally {
        if (!cancelled) {
          setTasksLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearFormFields, effectiveProjectId, open]);

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

  const populateFormFromTask = useCallback(
    (task: ModalTask) => {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(toDateInputValue(task.dueDate));
      setAssigneeId(task.assigneeId || "");
      setAddressSearch(task.address || "");
      setAddressSuggestions([]);
      setSelectedLocation(task.location ? { lat: task.location.lat, lng: task.location.lng } : null);
    },
    []
  );

  const handleEditTask = useCallback(
    (task: ModalTask) => {
      const normalized = normalizeTask(task, task.projectId || effectiveProjectId || "");
      setEditingTask(normalized);
      if (!scopedProjectId) {
        setProjectId(normalized.projectId);
      }
      populateFormFromTask(normalized);
      setSuccessMessage(null);
      setErrorMessage(null);
    },
    [effectiveProjectId, populateFormFromTask, scopedProjectId]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingTask(null);
    clearFormFields();
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [clearFormFields]);

  const handleDeleteTask = useCallback(
    async (task: ModalTask) => {
      const identifier = getTaskIdentifier(task);
      if (!identifier || deletingTaskId) {
        return;
      }

      setDeletingTaskId(identifier);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        await deleteTask({
          projectId: task.projectId,
          taskId: identifier,
        });
        setTaskList((prev) => prev.filter((item) => getTaskIdentifier(item) !== identifier));
        if (getTaskIdentifier(editingTask) === identifier) {
          setEditingTask(null);
          clearFormFields();
        }
        setSuccessMessage("Task deleted.");
        onCreated();
      } catch (error) {
        console.error("Failed to delete task", error);
        setErrorMessage("We couldn't delete that task. Please try again.");
      } finally {
        setDeletingTaskId(null);
      }
    },
    [clearFormFields, deletingTaskId, editingTask, onCreated]
  );

  if (!open || typeof document === "undefined") {
    return null;
  }

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

    const targetProjectId = editingTask?.projectId || effectiveProjectId;

    if (!targetProjectId) {
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

      if (isEditing && editingTask) {
        const identifier = getTaskIdentifier(editingTask);
        if (!identifier) {
          throw new Error("Missing task identifier for update");
        }

        const shouldClearAddress = !trimmedAddress && Boolean(editingTask.address);
        const shouldClearLocation = !locationPayload && Boolean(editingTask.location);
        const shouldClearAssignee = !assigneeId && Boolean(editingTask.assigneeId);

        const updated = await updateTask({
          projectId: targetProjectId,
          taskId: identifier,
          title: trimmedTitle,
          description: description.trim() || undefined,
          dueDate: dueDateIso,
          status: editingTask.status || "todo",
          ...(assigneeId ? { assigneeId } : shouldClearAssignee ? { assigneeId: "" } : {}),
          ...(trimmedAddress ? { address: trimmedAddress } : shouldClearAddress ? { address: "" } : {}),
          ...(locationPayload
            ? { location: locationPayload }
            : shouldClearLocation
            ? { location: null }
            : {}),
        });

        const normalized = normalizeTask(
          {
            ...editingTask,
            ...updated,
            projectId: targetProjectId,
            title: trimmedTitle,
            description: description.trim() || undefined,
            dueDate: dueDateIso,
            assigneeId: assigneeId || undefined,
            address: trimmedAddress || (shouldClearAddress ? undefined : editingTask.address),
            location: locationPayload || (shouldClearLocation ? undefined : editingTask.location),
          },
          targetProjectId
        );

        setTaskList((prev) =>
          prev.map((task) => (getTaskIdentifier(task) === identifier ? normalized : task))
        );
        setEditingTask(null);
        clearFormFields();
        setSuccessMessage("Task updated. Your changes are saved.");
        onCreated();
      } else {
        const created = await createTask({
          projectId: targetProjectId,
          title: trimmedTitle,
          description: description.trim() || undefined,
          dueDate: dueDateIso,
          status: "todo",
          ...(assigneeId ? { assigneeId } : {}),
          ...(trimmedAddress ? { address: trimmedAddress } : {}),
          ...(locationPayload ? { location: locationPayload } : {}),
        });

        const normalized = normalizeTask(
          {
            ...created,
            projectId: targetProjectId,
            title: trimmedTitle,
            description: description.trim() || undefined,
            dueDate: dueDateIso,
            assigneeId: assigneeId || undefined,
            address: trimmedAddress || undefined,
            location: locationPayload,
          },
          targetProjectId
        );

        setTaskList((prev) => {
          const identifier = getTaskIdentifier(normalized);
          if (!identifier) {
            return [normalized, ...prev];
          }
          const existingIndex = prev.findIndex((task) => getTaskIdentifier(task) === identifier);
          if (existingIndex === -1) {
            return [normalized, ...prev];
          }
          const next = [...prev];
          next.splice(existingIndex, 1, normalized);
          return next;
        });

        setSuccessMessage("Task created. You'll see it in your lists shortly.");
        clearFormFields();
        onCreated();
        requestAnimationFrame(() => {
          titleInputRef.current?.focus({ preventScroll: true });
        });
      }
    } catch (error) {
      console.error("Failed to save task", error);
      setErrorMessage("We couldn't save that task. Please try again.");
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
            {tasksLoading ? (
              <div className={styles.taskListState}>Loading tasks…</div>
            ) : tasksError ? (
              <div className={`${styles.feedback} ${styles.feedbackError}`}>{tasksError}</div>
            ) : sortedTasks.length ? (
              <div className={styles.existingTasksSection}>
                <div className={styles.existingTasksHeader}>
                  <h3 className={styles.existingTasksTitle}>Task list</h3>
                  <p className={styles.existingTasksHint}>Edit or delete items you've already created.</p>
                </div>
                <ul className={styles.existingTasksList}>
                  {sortedTasks.map((task) => {
                    const identifier = getTaskIdentifier(task);
                    const isActive = getTaskIdentifier(editingTask) === identifier;
                    const isEditable = Boolean(identifier);
                    return (
                      <li
                        key={identifier || `${task.projectId}-${task.title}`}
                        className={`${styles.existingTaskItem} ${
                          isActive ? styles.existingTaskItemActive : ""
                        }`}
                      >
                        <div className={styles.existingTaskInfo}>
                          <span className={styles.existingTaskTitle}>{task.title}</span>
                          <span className={styles.existingTaskMeta}>{formatTaskMeta(task)}</span>
                        </div>
                        <div className={styles.existingTaskActions}>
                          <button
                            type="button"
                            className={styles.taskActionButton}
                            onClick={() => handleEditTask(task)}
                            disabled={!isEditable || submitting || deletingTaskId === identifier}
                          >
                            {isActive ? "Editing" : "Edit"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.taskActionButton} ${styles.taskDeleteButton}`}
                            onClick={() => handleDeleteTask(task)}
                            disabled={!isEditable || submitting || deletingTaskId === identifier}
                          >
                            {deletingTaskId === identifier ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : !tasksLoading ? (
              <div className={styles.taskListEmpty}>No tasks yet. Create your first task below.</div>
            ) : null}
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
                <span>{isEditing ? "Save changes" : "Save task"}</span>
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className={styles.taskActionButton}
                  onClick={handleCancelEdit}
                  disabled={submitting}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default QuickCreateTaskModal;
