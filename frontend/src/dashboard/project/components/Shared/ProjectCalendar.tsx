import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  MouseEvent,
  FormEvent,
} from "react";
import { v4 as uuid } from "uuid";
import "./project-calendar.css";
import Modal from "../../../../shared/ui/ModalWithStack";
import { useData } from "../../../../app/contexts/useData";
import { useSocket } from "../../../../app/contexts/useSocket";
import { normalizeMessage } from "../../../../shared/utils/websocketUtils";
import { getColor } from "../../../../shared/utils/colorUtils";
import { startOfWeek, endOfWeek, addDays, rangePct } from "@/dashboard/home/utils/dateUtils";
import { createBudgetItem, updateBudgetItem, createEvent as createEventApi, updateEvent as updateEventApi, deleteEvent as deleteEventApi } from "../../../../shared/utils/api";
import { slugify } from "../../../../shared/utils/slug";
import { parseBudget, formatUSD } from "../../../../shared/utils/budgetUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
// Frontend no longer persists timeline events directly; backend handles persistence
import { useBudget } from "@/dashboard/project/features/budget/context/BudgetContext";

type TimelineEvent = {
  id: string;
  eventId?: string;
  date: string; // YYYY-MM-DD
  description?: string;
  hours?: number | string;
  budgetItemId?: string | null;
  createdAt?: string;
  createdBy?: string;
  payload?: Record<string, unknown>;
};

type Project = {
  projectId: string;
  title?: string;
  color?: string;
  dateCreated?: string;
  productionStart?: string;
  finishline?: string;
  timelineEvents?: TimelineEvent[];
  address?: string;
  company?: string;
  clientName?: string;
  invoiceBrandName?: string;
  invoiceBrandAddress?: string;
  clientAddress?: string;
  invoiceBrandPhone?: string;
  clientPhone?: string;
  clientEmail?: string;
};

interface ProjectCalendarProps {
  project: Project;
  initialFlashDate?: string | null;
  onDateSelect?: (dateKey: string | null) => void;
  showEventList?: boolean;
  onWrapperClick?: () => void;
}

const CATEGORY_OPTIONS = [
  "AUDIO-VISUAL",
  "CLIENT-SERVICES-VIP",
  "CONTINGENCY-MISC",
  "DECOR",
  "DESIGN",
  "FABRICATION",
  "FOOD-BEVERAGE",
  "GRAPHICS",
  "INSTALLATION-MATERIALS",
  "LABOR",
  "LIGHTING",
  "MERCH-SWAG",
  "PARKING-FUEL-TOLLS",
  "PERMITS-INSURANCE",
  "PRODUCTION-MGMT",
  "RENTALS",
  "STORAGE",
  "TECH-INTERACTIVES",
  "TRAVEL",
  "TRUCKING",
  "VENUE-LOCATION-FEES",
  "WAREHOUSE",
] as const;

const UNIT_OPTIONS = [
  "Each",
  "Hrs",
  "Days",
  "EA",
  "PCS",
  "Box",
  "LF",
  "SQFT",
  "KG",
] as const;

const DOT_SIZE = 10;
const DOT_STROKE = 2;
const DOT_MAX_VISIBLE = 4;
const DOT_OVERLAP_PX = 3;

function safeParse(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map((p) => parseInt(p, 10));
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

// Format a Date object as YYYY-MM-DD using local time
function getDateKey(date?: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function computeFinalCost(
  qty: number | string,
  budget: number | string,
  mark: number | string
): string {
  const budgetNum = parseBudget(budget);
  const markNum = parseFloat(String(mark).replace(/%/g, ""));
  const markupNum = Number.isNaN(markNum) ? 0 : markNum / 100;
  const qtyNum = parseFloat(String(qty)) || 0;
  const final = budgetNum * (1 + markupNum) * (qtyNum || 1);
  return budgetNum ? formatUSD(final) : "";
}

const ProjectCalendar: React.FC<ProjectCalendarProps> = ({
  project,
  initialFlashDate,
  onDateSelect,
  showEventList = true,
  onWrapperClick,
}) => {
  const { activeProject, user } = useData();
  const { ws } = useSocket() || {};

  const startDate = useMemo(
    () => safeParse((project?.productionStart as string) || (project?.dateCreated as string)),
    [project?.productionStart, project?.dateCreated]
  );

  const endDate = useMemo(() => {
    const parsed = safeParse(project?.finishline as string);
    if (!parsed && startDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 30);
      return d;
    }
    return parsed;
  }, [project?.finishline, startDate]);

  const today = useMemo(() => new Date(), []);
  const landingDate = useMemo(() => {
    if (!startDate) return today;
    if (today < startDate) return startDate;
    if (endDate && today > endDate) return endDate;
    return today;
  }, [startDate, endDate, today]);

  const defaultActiveStartDate = useMemo(() => {
    if (startDate) {
      const rangeEnd = endDate || new Date(startDate.getTime() + 30 * 86400000);
      const midTime =
        startDate.getTime() + (rangeEnd.getTime() - startDate.getTime()) / 2;
      const mid = new Date(midTime);
      return new Date(mid.getFullYear(), mid.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [startDate, endDate, today]);

  const [selectedDate, setSelectedDate] = useState<Date>(landingDate);
  const [activeStartDate, setActiveStartDate] =
    useState<Date>(defaultActiveStartDate);
  const userNavigatedRef = useRef(false);

  const [events, setEvents] = useState<TimelineEvent[]>(
    project?.timelineEvents || []
  );

  const [showModal, setShowModal] = useState(false);
  const [eventDesc, setEventDesc] = useState("");
  const [eventHours, setEventHours] = useState<string>("");
  const [startDateInput, setStartDateInput] = useState<string>(
    getDateKey(selectedDate) || ""
  );
  const [endDateInput, setEndDateInput] = useState<string>(
    getDateKey(selectedDate) || ""
  );
  const [descOptions, setDescOptions] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const calendarWrapperRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextWrapperClickRef = useRef(false);

  const { budgetHeader, budgetItems, setBudgetItems } = useBudget();

  const [flashDate, setFlashDate] = useState<Date | null>(
    initialFlashDate ? safeParse(initialFlashDate) : null
  );

  const projectColor = useMemo(
    () => project?.color || getColor(project?.projectId || project?.title || "project"),
    [project?.color, project?.projectId, project?.title]
  );

  const monthStart = useMemo(
    () => new Date(activeStartDate.getFullYear(), activeStartDate.getMonth(), 1),
    [activeStartDate]
  );
  const monthEnd = useMemo(
    () => new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0),
    [monthStart]
  );
  const monthTitle = useMemo(
    () => monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    [monthStart]
  );
  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, idx) =>
      addDays(base, idx).toLocaleDateString(undefined, { weekday: "short" })
    );
  }, []);
  const calendarWeeks = useMemo(() => {
    const first = startOfWeek(monthStart);
    const last = endOfWeek(monthEnd);
    const totalDays = Math.round((last.getTime() - first.getTime()) / 86400000) + 1;
    const weeks: Array<Array<{ date: Date; key: string; inMonth: boolean }>> = [];
    for (let i = 0; i < totalDays; i += 1) {
      const day = addDays(first, i);
      const entry = { date: day, key: getDateKey(day)!, inMonth: day.getMonth() === monthStart.getMonth() };
      if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) {
        weeks.push([]);
      }
      weeks[weeks.length - 1].push(entry);
    }
    while (weeks.length && weeks[weeks.length - 1].every((d) => !d.inMonth)) {
      weeks.pop();
    }
    return weeks;
  }, [monthStart, monthEnd]);
  const selectedKey = getDateKey(selectedDate);
  const hoverKey = getDateKey(hoverDate);
  const flashKey = getDateKey(flashDate);
  const todayKey = getDateKey(today);

  // Budget-line creation fields
  const [createLineItem, setCreateLineItem] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [elementKey, setElementKey] = useState<string>("");
  const [elementId, setElementId] = useState<string>("");
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unit, setUnit] = useState<string>("Each");
  const [budgetedCost, setBudgetedCost] = useState<string>("");
  const [markup, setMarkup] = useState<string>("");
  const [finalCost, setFinalCost] = useState<string>("");

  // No-op persistence: backend persists after WS emit

  const handleDateSelection = useCallback((date: Date) => {
    userNavigatedRef.current = true;
    setSelectedDate(date);
    onDateSelect?.(getDateKey(date));
  }, [onDateSelect]);

  useEffect(() => {
    if (initialFlashDate) {
      const d = safeParse(initialFlashDate);
      if (d) {
        setSelectedDate(d);
        setActiveStartDate(new Date(d.getFullYear(), d.getMonth(), 1));
        setFlashDate(d);
      }
    }
  }, [initialFlashDate]);

  const isMobile = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(hover: none)").matches,
    []
  );

  // Join the project's WS room
  useEffect(() => {
    if (!ws || !project?.projectId) return;

    const payload = JSON.stringify({
      action: "setActiveConversation",
      conversationId: `project#${project.projectId}`,
    });

    const sendWhenReady = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      } else {
        const onOpen = () => {
          ws.send(payload);
          ws.removeEventListener("open", onOpen);
        };
        ws.addEventListener("open", onOpen);
      }
    };

    sendWhenReady();
  }, [ws, project?.projectId]);

  // Keep selection synced to landing date if user hasn't moved
  useEffect(() => {
    if (!userNavigatedRef.current) setSelectedDate(landingDate);
  }, [landingDate]);

  // Keep calendar month synced to default if user hasn't moved (and no flash date)
  useEffect(() => {
    if (initialFlashDate) return;
    if (!userNavigatedRef.current) setActiveStartDate(defaultActiveStartDate);
  }, [defaultActiveStartDate, initialFlashDate]);

  useEffect(() => {
    userNavigatedRef.current = false;
  }, [project?.projectId]);

  // Sync events on project change
  useEffect(() => {
    setEvents(project?.timelineEvents || []);
  }, [project]);

  // Flash date highlight
  useEffect(() => {
    if (!flashDate) return;
    const t = window.setTimeout(() => setFlashDate(null), 800);
    return () => window.clearTimeout(t);
  }, [flashDate]);

  const rangeSet = useMemo(() => {
    const set = new Set<string>();
    if (startDate && endDate) {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        set.add(getDateKey(d)!);
      }
    }
    return set;
  }, [startDate, endDate]);

  const eventsByDate = useMemo(
    () =>
      events.reduce<Record<string, TimelineEvent[]>>((acc, ev) => {
        if (ev.date) {
          (acc[ev.date] ||= []).push(ev);
        }
        return acc;
      }, {}),
    [events]
  );

  const extractDescOptions = useCallback((evts: TimelineEvent[]) => {
    return Array.from(
      new Set(
        evts
          .map((ev) => (ev.description || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );
  }, []);

  useEffect(() => {
    setDescOptions(extractDescOptions(events));
  }, [events, extractDescOptions]);

  const getNextElementKey = useCallback(() => {
    const slug = slugify((activeProject?.title || "").trim());
    let max = 0;
    budgetItems.forEach((it: Record<string, unknown>) => {
      if (typeof it.elementKey === "string") {
        const match = it.elementKey.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > max) max = num;
        }
      }
    });
    const nextNum = String(max + 1).padStart(4, "0");
    return `${slug}-${nextNum}`;
  }, [activeProject?.title, budgetItems]);

  const getNextElementId = useCallback(
    (cat?: string) => {
      if (!cat) return "";
      let max = 0;
      budgetItems.forEach((it: Record<string, unknown>) => {
        if (it.category === cat && typeof it.elementId === "string") {
          const match = it.elementId.match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > max) max = num;
          }
        }
      });
      return `${cat}-${String(max + 1).padStart(4, "0")}`;
    },
    [budgetItems]
  );

  // Initialize budget fields when toggling line item creation
  useEffect(() => {
    if (createLineItem) {
      const cat = category || CATEGORY_OPTIONS[0];
      if (!category) setCategory(cat);
      setElementKey(getNextElementKey());
      setElementId(getNextElementId(cat));
    }
  }, [createLineItem, getNextElementKey, getNextElementId, category]);

  // Keep element id in sync with selected category
  useEffect(() => {
    if (createLineItem && category) {
      setElementId(getNextElementId(category));
    }
  }, [category, createLineItem, getNextElementId]);

  // Update computed final cost live
  useEffect(() => {
    setFinalCost(computeFinalCost(quantity, budgetedCost, markup));
  }, [quantity, budgetedCost, markup]);

  const saveEvent = async (e?: FormEvent) => {
    e?.preventDefault();

    const start = safeParse(startDateInput) || selectedDate;
    let end = safeParse(endDateInput);
    if (!end || end < start) end = start;

    const desc = eventDesc.trim().toUpperCase();
    const existing = editId ? events.find((ev) => ev.id === editId) : null;
    const existingBudgetItemId = existing?.budgetItemId || null;

    let createdBudgetItemId: string | null = null;

    // Create / update related budget item
    if (createLineItem && budgetHeader?.budgetId && project?.projectId) {
      try {
        const markNum = parseFloat(String(markup).replace(/%/g, ""));
        const markupNum = Number.isNaN(markNum) ? 0 : markNum / 100;
        const qtyNum = parseFloat(String(quantity)) || 0;
        const budgetNum = parseBudget(budgetedCost);
        const final = budgetNum * (1 + markupNum) * (qtyNum || 1);

        const itemData = {
          description: desc,
          category,
          elementKey,
          elementId,
          quantity: qtyNum,
          unit,
          itemBudgetedCost: budgetNum,
          itemMarkUp: markupNum,
          itemFinalCost: final,
          revision: budgetHeader.revision as number,
        };

        if (existingBudgetItemId) {
          const updated = await updateBudgetItem(
            project.projectId,
            existingBudgetItemId,
            itemData
          );
          setBudgetItems(
            budgetItems.map((it) =>
              it.budgetItemId === existingBudgetItemId ? updated : it
            )
          );
        } else {
          const item = await createBudgetItem(project.projectId, budgetHeader.budgetId as string, {
            ...itemData,
            budgetItemId: `LINE-${uuid()}`,
          });
          createdBudgetItemId = item.budgetItemId;
          setBudgetItems([...budgetItems, item]);
        }
      } catch (err) {
         
        console.error("Error creating budget item", err);
      }
    }

    const budgetItemId = createdBudgetItemId || existingBudgetItemId || null;

    // Build new list: remove edited id (if any), then add a row for each date in range
    const updated: TimelineEvent[] =
      editId !== null ? events.filter((ev) => ev.id !== editId) : [...events];

    const nowIso = new Date().toISOString();
    for (
      let d = new Date(start), i = 0;
      d <= (end as Date);
      d.setDate(d.getDate() + 1), i++
    ) {
      const dateKey = getDateKey(d)!;
      const id = i === 0 && editId !== null ? editId : uuid();
        const ev: TimelineEvent = {
          id,
          eventId: id,
          date: dateKey,
          description: desc,
          hours: Number(eventHours),
          createdAt: nowIso,
          createdBy: user?.userId,
          ...(budgetItemId ? { budgetItemId } : {}),
        };
      updated.push(ev);
    }

    const existingIds = new Set(events.map((ev) => ev.id));
      const persisted: TimelineEvent[] = [];
      for (const ev of updated) {
        const eventId = ev.id || uuid();
        const payload = {
          projectId: project.projectId,
          eventId,
          id: eventId,
          date: ev.date,
          description: ev.description,
          hours: Number(ev.hours || 0),
          createdAt: ev.createdAt || new Date().toISOString(),
          createdBy: ev.createdBy || user?.userId,
          ...(ev.budgetItemId ? { budgetItemId: ev.budgetItemId } : {}),
        } as TimelineEvent & { projectId: string; eventId: string };
        try {
          if (existingIds.has(ev.id)) {
            await updateEventApi(payload);
          } else {
            await createEventApi(project.projectId, payload);
          }
          persisted.push(payload);
        } catch (err) {
          console.error('Error saving event', err);
        }
      }

      setEvents(persisted);
      setDescOptions(extractDescOptions(persisted));

      const timelineAction = editId ? "modified" : "added";

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify(
            normalizeMessage(
              {
                action: "timelineUpdated",
                projectId: project.projectId,
                title: activeProject?.title,
                events: persisted,
                conversationId: `project#${project.projectId}`,
                username: user?.firstName || "Someone",
                senderId: user?.userId,
                timelineAction,
              },
              "timelineUpdated"
            )
          )
        );
      }


    // Reset modal state
    setShowModal(false);
    setEventDesc("");
    setEventHours("");
    setEditId(null);
    setCreateLineItem(false);
    setCategory("");
    setElementKey("");
    setElementId("");
    setQuantity(1);
    setUnit("Each");
    setBudgetedCost("");
    setMarkup("");
    setFinalCost("");

    const key = getDateKey(selectedDate) || "";
    setStartDateInput(key);
    setEndDateInput(key);
  };

  const openAddEventModal = (e?: MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    e?.preventDefault();
    setEventDesc("");
    setEventHours("");
    setEditId(null);
    setCreateLineItem(false);
    setCategory("");
    setElementKey("");
    setElementId("");
    setQuantity(1);
    setUnit("Each");
    setBudgetedCost("");
    setMarkup("");
    setFinalCost("");
    const key = getDateKey(selectedDate) || "";
    setStartDateInput(key);
    setEndDateInput(key);
    setShowModal(true);
  };

  const handleWrapperClick = (e: MouseEvent<HTMLDivElement>) => {
    if (showModal) return;
    if (ignoreNextWrapperClickRef.current) {
      ignoreNextWrapperClickRef.current = false;
      return;
    }
    onWrapperClick?.(e);
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEventDesc(e.target.value.toUpperCase());
  };
  const handleBudgetedCostChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setBudgetedCost(e.target.value);

  const handleBudgetedCostBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseBudget(e.target.value);
    setBudgetedCost(num ? String(num) : "");
  };

  const handleMarkupChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setMarkup(e.target.value);

  const handleMarkupBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = parseFloat(String(e.target.value).replace(/%/g, ""));
    if (!Number.isNaN(num)) setMarkup(`${num}%`);
    else setMarkup("");
  };

  const openEditEventModal = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    const d = safeParse(ev.date) || new Date();
    setSelectedDate(d);
    setEventDesc((ev.description || "").toUpperCase());
    setEventHours(String(ev.hours ?? ""));
    setStartDateInput(ev.date || getDateKey(selectedDate) || "");
    setEndDateInput(ev.date || getDateKey(selectedDate) || "");
    setEditId(id);

    if (ev.budgetItemId) {
      const item = budgetItems.find(
        (it) => it.budgetItemId === ev.budgetItemId
      );
      if (item) {
        setCreateLineItem(true);
        setCategory(String((item as Record<string, unknown>).category || ""));
        setElementKey(String((item as Record<string, unknown>).elementKey || ""));
        setElementId(String((item as Record<string, unknown>).elementId || ""));
        setQuantity((item as Record<string, unknown>).quantity as number ?? 1);
        setUnit(String((item as Record<string, unknown>).unit || "Each"));
        setBudgetedCost(
          (item as Record<string, unknown>).itemBudgetedCost != null ? String((item as Record<string, unknown>).itemBudgetedCost) : ""
        );
        setMarkup(
          (item as Record<string, unknown>).itemMarkUp != null ? `${((item as Record<string, unknown>).itemMarkUp as number || 0) * 100}%` : ""
        );
        setFinalCost(
          (item as Record<string, unknown>).itemFinalCost != null ? formatUSD((item as Record<string, unknown>).itemFinalCost as string | number) : ""
        );
      } else {
        setCreateLineItem(false);
      }
    } else {
      setCreateLineItem(false);
    }
    setShowModal(true);
  };

  const focusCalendarOnDate = useCallback((date?: Date | null) => {
    if (!date) return;
    const anchor = new Date(date.getFullYear(), date.getMonth(), 1);
    setFlashDate(date);
    setActiveStartDate(anchor);
    userNavigatedRef.current = true;
    calendarWrapperRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  const goToPrevMonthView = useCallback(() => {
    const prev = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    setActiveStartDate(prev);
    userNavigatedRef.current = true;
  }, [monthStart]);

  const goToNextMonthView = useCallback(() => {
    const next = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    setActiveStartDate(next);
    userNavigatedRef.current = true;
  }, [monthStart]);

  const queueHover = useCallback((date: Date) => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoverDate(date), 100);
  }, []);

  const queueHoverClear = useCallback(() => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoverDate(null), 200);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    };
  }, []);

  const handleDayClick = useCallback(
    (date: Date, inMonth: boolean) => {
      handleDateSelection(date);
      if (!inMonth) {
        setActiveStartDate(new Date(date.getFullYear(), date.getMonth(), 1));
      }
      userNavigatedRef.current = true;
      if (isMobile) {
        setHoverDate(date);
      }
    },
    [handleDateSelection, isMobile]
  );

  const eventsForSelected = eventsByDate[getDateKey(selectedDate)!] || [];
  const eventDateKeys = useMemo(
    () => Object.keys(eventsByDate).sort(),
    [eventsByDate]
  );
  const currentKey = getDateKey(selectedDate)!;

  const goToPrevEventDate = useCallback(() => {
    const prev = [...eventDateKeys].reverse().find((d) => d < currentKey);
    if (prev) {
      const date = safeParse(prev)!;
      handleDateSelection(date);
      focusCalendarOnDate(date);
    }
  }, [eventDateKeys, currentKey, handleDateSelection, focusCalendarOnDate]);

  const goToNextEventDate = useCallback(() => {
    const next = eventDateKeys.find((d) => d > currentKey);
    if (next) {
      const date = safeParse(next)!;
      handleDateSelection(date);
      focusCalendarOnDate(date);
    }
  }, [eventDateKeys, currentKey, handleDateSelection, focusCalendarOnDate]);

  const hasPrevEvent = eventDateKeys.some((d) => d < currentKey);
  const hasNextEvent = eventDateKeys.some((d) => d > currentKey);

  // Arrow key navigation (not when modal open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showModal) return;
      if (e.key === "ArrowLeft") {
        goToPrevEventDate();
      } else if (e.key === "ArrowRight") {
        goToNextEventDate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, eventDateKeys, currentKey, goToNextEventDate, goToPrevEventDate]);

  const totalHoursForDay = eventsForSelected.reduce(
    (sum, ev) => sum + Number(ev.hours || 0),
    0
  );
  const totalHoursForProject = events.reduce(
    (sum, ev) => sum + Number(ev.hours || 0),
    0
  );

  const handleDeleteEvent = async (id: string) => {
    const updated = events.filter((ev) => ev.id !== id);
    setEvents(updated);
    setDescOptions(extractDescOptions(updated));
    try {
      await deleteEventApi(project.projectId, id);
    } catch (err) {
      console.error('Error deleting event', err);
    }

    if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
      const normalized = updated.map((ev) => {
        const eid = ev.id || uuid();
        return {
          ...ev,
          id: eid,
          eventId: ev.eventId || eid,
          createdAt: ev.createdAt || new Date().toISOString(),
        } as TimelineEvent;
      });
      ws.send(
        JSON.stringify(
          normalizeMessage(
            {
              action: "timelineUpdated",
              projectId: project.projectId,
              title: activeProject?.title,
              events: normalized,
              conversationId: `project#${project.projectId}`,
              username: user?.firstName || "Someone",
              senderId: user?.userId,
              timelineAction: "deleted",
            },
            "timelineUpdated"
          )
        )
      );
    }
  };

  return (
    <div className="dashboard-item project-calendar-wrapper" onClick={handleWrapperClick}>

      <div ref={calendarWrapperRef} className="calendar-content">
        <div className="month-widget">
          <div className="month-widget-header">
            <button className="month-nav-btn" onClick={goToPrevMonthView} aria-label="Previous month">
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <span className="month-title">{monthTitle}</span>
            <button className="month-nav-btn" onClick={goToNextMonthView} aria-label="Next month">
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>

          <div className="calendar-weekdays">
            {weekdayLabels.map((label, idx) => (
              <div key={`${label}-${idx}`} className="calendar-weekday">
                {label}
              </div>
            ))}
          </div>

          <div className="calendar-weeks">
            {calendarWeeks.map((week, weekIdx) => {
              const rowStart = startOfWeek(week[0].date);
              const rowEnd = endOfWeek(week[0].date);
              let weekTrack: { left: number; width: number } | null = null;

              if (startDate && endDate) {
                const { left, width } = rangePct(startDate, endDate, rowStart, rowEnd);
                if (width > 0) {
                  weekTrack = { left, width };
                }
              }

              return (
                <div className="calendar-week" key={`week-${weekIdx}`}>
                  {weekTrack && (
                    <div
                      className="calendar-week-track"
                      style={{
                        left: `${weekTrack.left}%`,
                        width: `${weekTrack.width}%`,
                        backgroundColor: projectColor,
                      }}
                      aria-hidden
                    />
                  )}

                  {week.map(({ date, key, inMonth }) => {
                    const dayEvents = eventsByDate[key] || [];
                    const dayDots = dayEvents.map((e, idx) => project?.color || getColor(e.description || String(idx)));
                    const isSelected = selectedKey === key;
                    const isToday = todayKey === key;
                    const isFlashing = flashKey === key;
                    const isHovered = hoverKey === key;
                    const inRange = rangeSet.has(key);
                    const dayClassName = [
                      "calendar-day",
                      inMonth ? "" : "calendar-day--muted",
                      isToday ? "today" : "",
                      isSelected ? "selected" : "",
                      isFlashing ? "tile-highlight" : "",
                      inRange ? "in-range" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const totalHours = dayEvents.reduce(
                      (sum, ev) => sum + Number(ev.hours || 0),
                      0
                    );
                    return (
                      <div key={key} className="calendar-day-wrapper">
                        <div
                          className={dayClassName}
                          onMouseEnter={!isMobile ? () => queueHover(date) : undefined}
                          onMouseLeave={!isMobile ? queueHoverClear : undefined}
                          onClick={() => handleDayClick(date, inMonth)}
                          onPointerUp={(evt) => {
                            if (evt.pointerType === "touch") handleDayClick(date, inMonth);
                          }}
                          role="button"
                          aria-label={date.toDateString()}
                        >
                          <div className="tile-date-number">{date.getDate()}</div>

                          <div className="day-dots">
                            {dayDots.slice(0, DOT_MAX_VISIBLE).map((color, idx) => (
                              <svg
                                key={`${key}-dot-${idx}`}
                                width={DOT_SIZE}
                                height={DOT_SIZE}
                                viewBox="0 0 24 24"
                                style={{
                                  marginLeft: idx ? -DOT_OVERLAP_PX : 0,
                                  filter: "drop-shadow(0 1px 1px rgba(0,0,0,.45))",
                                  zIndex: 20 - idx,
                                }}
                                aria-hidden
                              >
                                <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.65)" />
                                <circle cx="12" cy="12" r={10 - DOT_STROKE} fill="none" stroke={color} strokeWidth={DOT_STROKE} />
                                <path d="M12 7v5l3 2" stroke={color} strokeWidth={DOT_STROKE} fill="none" strokeLinecap="round" />
                              </svg>
                            ))}
                            {dayDots.length > DOT_MAX_VISIBLE && (
                              <span className="day-dot-more">+{dayDots.length - DOT_MAX_VISIBLE}</span>
                            )}
                          </div>

                          {isHovered && dayEvents.length > 0 && (
                            <div className="tile-tooltip visible">
                              {dayEvents.map((e, idx) => (
                                <div className="tooltip-item" key={`${key}-tip-${idx}`}>
                                  <FontAwesomeIcon
                                    icon={faClock}
                                    className="tooltip-dot"
                                    style={{
                                      color: project?.color || getColor(e.description || String(idx)),
                                    }}
                                  />
                                  <span className="tooltip-text">
                                    {e.description?.toUpperCase()} ({e.hours}{" "}
                                    {Number(e.hours) === 1 ? "HR" : "HRS"})
                                  </span>
                                </div>
                              ))}
                              <div className="tooltip-info">{totalHours} hrs</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>


        {showEventList && (
          <>
            <div className="events-nav">
              <button onClick={goToPrevEventDate} disabled={!hasPrevEvent}>
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button onClick={goToNextEventDate} disabled={!hasNextEvent}>
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>

            <div className="events-log">
              <h3 className="events-log-date">
                Events on {getDateKey(selectedDate)}
              </h3>

              {eventsForSelected.length === 0 ? (
                <div>No events</div>
              ) : (
                <ul>
                  {eventsForSelected.map((e, idx) => {
                    const idKey = e.description || String(idx);
                    const color = project?.color || getColor(idKey);
                    return (
                      <li className="event-item" key={e.id || `${idx}`}>
                        <FontAwesomeIcon
                          icon={faClock}
                          className="list-dot"
                          style={{ color }}
                        />
                        {e.description?.toUpperCase()} ({e.hours}{" "}
                        {Number(e.hours) === 1 ? "HR" : "HRS"})
                        <button
                          className="edit-event-btn"
                          onClick={() => openEditEventModal(e.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-event-btn"
                          onClick={() => handleDeleteEvent(e.id)}
                        >
                          Delete
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="events-log-totals">
                <span>Day Total: {totalHoursForDay} hrs</span>
                <span>Project Total: {totalHoursForProject} hrs</span>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className="address-button add-event-button"
        onClick={openAddEventModal}
      >
        Add Event
      </button>

      <Modal
        isOpen={showModal}
        onRequestClose={(event?: MouseEvent) => {
          if (event?.type === "click") {
            ignoreNextWrapperClickRef.current = true;
          }
          setShowModal(false);
        }}
        contentLabel="Add Event"
        style={{
          overlay: { backgroundColor: "rgba(0, 0, 0, 0.75)" },
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            color: "white",
            width: "400px",
            maxHeight: "90vh",
            padding: "20px",
            borderRadius: "20px",
            overflow: "auto",
          },
        }}
      >
        <h3 className="add-event-title">{editId ? "Edit" : "Add"} Event</h3>

        <form onSubmit={saveEvent} className="modal-form">
          <input
            type="date"
            placeholder="Start Date"
            value={startDateInput}
            onChange={(e) => setStartDateInput(e.target.value)}
            className="modal-input"
          />
          <input
            type="date"
            placeholder="End Date"
            value={endDateInput}
            onChange={(e) => setEndDateInput(e.target.value)}
            className="modal-input"
          />
          <input
            type="text"
            placeholder="Description"
            value={eventDesc}
            onChange={handleDescChange}
            className="modal-input-description"
            list="event-desc-options"
          />

          <div className="unit-input-wrapper">
            <input
              type="text"
              placeholder="Hours"
              value={eventHours}
              onChange={(e) => setEventHours(e.target.value)}
              className="modal-input unit-input"
            />
            <span className="unit-suffix">Hrs</span>
          </div>

          <label style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              checked={createLineItem}
              onChange={(e) => setCreateLineItem(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Create budget line item
          </label>

          {createLineItem && (
            <>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="modal-input"
              >
                <option hidden value="" />
                {CATEGORY_OPTIONS.map((c) => (
                  <option value={c} key={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Element Key"
                value={elementKey}
                onChange={(e) => setElementKey(e.target.value)}
                className="modal-input"
              />

              <input
                type="text"
                placeholder="Element ID"
                value={elementId}
                onChange={(e) => setElementId(e.target.value)}
                className="modal-input"
              />

              <div className="unit-input-wrapper">
                <input
                  type="number"
                  placeholder={unit.toLowerCase().includes("hr") ? "Hours" : "Quantity"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="modal-input unit-input"
                />
                {unit.toLowerCase().includes("hr") && (
                  <span className="unit-suffix">hrs</span>
                )}
              </div>

              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="modal-input"
              >
                <option hidden value="" />
                {UNIT_OPTIONS.map((u) => (
                  <option value={u} key={u}>
                    {u}
                  </option>
                ))}
              </select>

              <div className="currency-input-wrapper">
                {budgetedCost && <span className="currency-prefix">$</span>}
                <input
                  type="text"
                  placeholder="Budgeted Cost"
                  value={budgetedCost}
                  onChange={handleBudgetedCostChange}
                  onBlur={handleBudgetedCostBlur}
                  className={`modal-input ${budgetedCost ? "currency-input" : ""}`}
                />
              </div>

              <input
                type="text"
                placeholder="Markup %"
                value={markup}
                onChange={handleMarkupChange}
                onBlur={handleMarkupBlur}
                className="modal-input"
              />

              <input
                type="text"
                placeholder="Final Cost"
                value={finalCost}
                readOnly
                className="modal-input"
              />
            </>
          )}

          <datalist id="event-desc-options">
            {descOptions.map((o) => (
              <option value={o} key={o} />
            ))}
          </datalist>

          <button className="modal-submit-button" type="submit">
            Save
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectCalendar;













