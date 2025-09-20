import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  MouseEvent as ReactMouseEvent,
  FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import "./project-calendar.css";
import Modal from "../../../../shared/ui/ModalWithStack";
import { useData } from "../../../../app/contexts/useData";
import { useSocket } from "../../../../app/contexts/useSocket";
import { normalizeMessage } from "../../../../shared/utils/websocketUtils";
import { getColor } from "../../../../shared/utils/colorUtils";
import EventPill from "../../components/Shared/EventPill";
import { startOfWeek, endOfWeek, addDays, rangePct } from "@/dashboard/home/utils/dateUtils";
import { createBudgetItem, updateBudgetItem, createEvent as createEventApi, updateEvent as updateEventApi, deleteEvent as deleteEventApi } from "../../../../shared/utils/api";
import { slugify } from "../../../../shared/utils/slug";
import { parseBudget, formatUSD } from "../../../../shared/utils/budgetUtils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faClock,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
// Frontend no longer persists timeline events directly; backend handles persistence
import { useBudget } from "@/dashboard/project/features/budget/context/BudgetContext";
import { notify } from "@/shared/ui/ToastNotifications";

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

const MOBILE_QUERY = "(max-width: 640px)";
const POPPER_GAP = 12;
const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const INTERACTIVE_SAFE_PAD = 12;

const WRAPPER_INTERACTIVE_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "[role=\"button\"]",
  "[role=\"link\"]",
  "[data-stop-card-nav]",
  ".calendar-day",
  ".calendar-day-wrapper",
].join(", ");

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

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isElementWithin(node: Node | null, container?: HTMLElement | null): boolean {
  if (!node || !container) return false;
  return container === node || container.contains(node as Node);
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const matcher = window.matchMedia(MOBILE_QUERY);
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(matcher.matches);
    matcher.addEventListener("change", listener);
    return () => matcher.removeEventListener("change", listener);
  }, []);

  return isMobile;
}

interface DayOverlayState {
  anchor: HTMLButtonElement | null;
  date: Date;
  dayKey: string;
}

function useDayOverlay() {
  const [state, setState] = useState<DayOverlayState | null>(null);
  const isMobile = useIsMobile();

  const open = useCallback((anchor: HTMLButtonElement, date: Date, dayKey: string) => {
    setState({ anchor, date, dayKey });
  }, []);

  const close = useCallback(() => {
    setState(null);
  }, []);

  return {
    anchor: state?.anchor || null,
    date: state?.date || null,
    dayKey: state?.dayKey || null,
    isOpen: Boolean(state),
    isMobile,
    open,
    close,
  } as const;
}

type DayOverlayAnalyticsAction = "open" | "create" | "edit";

function trackCalendarDay(action: DayOverlayAnalyticsAction, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const analytics = (window as typeof window & { analytics?: { track?: (event: string, data?: Record<string, unknown>) => void } }).analytics;
  analytics?.track?.(`project_calendar_day_${action}`, {
    source: "calendar-day",
    ...payload,
  });
}

interface CalendarDayButtonProps {
  date: Date;
  dayKey: string;
  inMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isFlashing: boolean;
  inRange: boolean;
  hasEvents: boolean;
  hasBadge?: boolean;
  label: string;
  onOpen: (anchor: HTMLButtonElement, meta: { date: Date; dayKey: string; inMonth: boolean }) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: React.ReactNode;
}

const CalendarDayButton = React.forwardRef<HTMLButtonElement, CalendarDayButtonProps>(
  (
    {
      date,
      dayKey,
      inMonth,
      isSelected,
      isToday,
      isFlashing,
      inRange,
      hasEvents,
      hasBadge,
      label,
      onOpen,
      onMouseEnter,
      onMouseLeave,
      children,
    },
    ref
  ) => {
    const className = [
      "calendar-day",
      inMonth ? "" : "calendar-day--muted",
      isToday ? "today" : "",
      isSelected ? "selected" : "",
      isFlashing ? "tile-highlight" : "",
      inRange ? "in-range" : "",
      hasBadge ? "has-badge" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const handleOpen = (event: ReactMouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      event.preventDefault();
      onOpen(event.currentTarget, { date, dayKey, inMonth });
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        handleOpen(event);
      }
    };

    const suffix = hasEvents ? ", has events" : ", no events";

    return (
      <button
        type="button"
        ref={ref}
        data-stopnav
        className={className}
        aria-pressed={isSelected}
        aria-haspopup="dialog"
        aria-label={`${label}${suffix}`}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </button>
    );
  }
);

CalendarDayButton.displayName = "CalendarDayButton";

interface DayOverlayContentProps {
  headerId: string;
  dateLabel: string;
  events: TimelineEvent[];
  onClose: () => void;
  onNew: () => void;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
}

const DayOverlayContent: React.FC<DayOverlayContentProps> = ({
  headerId,
  dateLabel,
  events,
  onClose,
  onNew,
  onEdit,
  onDelete,
}) => {
  const hasEvents = events.length > 0;

  return (
    <div className="day-overlay-surface" role="document">
      <header className="day-overlay-header">
        <h2 id={headerId} className="day-overlay-title">
          Events on {dateLabel}
        </h2>
        <button
          type="button"
          className="day-overlay-close"
          aria-label="Close"
          onClick={onClose}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </header>

      <div className="day-overlay-body">
        {hasEvents ? (
          <ul className="day-overlay-events" role="list">
            {events.map((event) => {
              const hoursLabel = (() => {
                if (event.hours === undefined || event.hours === null || event.hours === "") {
                  return null;
                }
                const hoursNumber = Number(event.hours);
                if (Number.isNaN(hoursNumber)) return `${event.hours}`;
                const suffix = hoursNumber === 1 ? "hr" : "hrs";
                return `${hoursNumber} ${suffix}`;
              })();

              return (
                <li key={event.id} className="day-overlay-event">
                  <div className="day-overlay-event-info">
                    <span className="day-overlay-event-title">
                      {event.description || "Untitled event"}
                    </span>
                    {hoursLabel && (
                      <span className="day-overlay-event-hours">{hoursLabel}</span>
                    )}
                  </div>
                  <div className="day-overlay-event-actions">
                    <button
                      type="button"
                      className="day-overlay-event-edit"
                      onClick={() => onEdit(event)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="day-overlay-event-delete"
                      onClick={() => onDelete(event)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="day-overlay-empty">No events yet</div>
        )}
      </div>

      <button
        type="button"
        className={`day-overlay-new ${hasEvents ? "" : "day-overlay-new--primary"}`.trim()}
        onClick={onNew}
      >
        + New event
      </button>
    </div>
  );
};

interface DayPopoverProps extends DayOverlayContentProps {
  anchor: HTMLButtonElement;
  onClose: () => void;
}

const DayPopover: React.FC<DayPopoverProps> = ({ anchor, onClose, ...contentProps }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const node = popoverRef.current;
    if (!node) return;
    setReady(false);
    const assignPosition = () => {
      const rect = anchor.getBoundingClientRect();
      const popRect = node.getBoundingClientRect();
      let top = rect.bottom + POPPER_GAP;
      let left = rect.left + rect.width / 2 - popRect.width / 2;

      if (top + popRect.height > window.innerHeight - 16) {
        top = Math.max(rect.top - popRect.height - POPPER_GAP, 16);
      }
      if (left + popRect.width > window.innerWidth - 16) {
        left = window.innerWidth - popRect.width - 16;
      }
      if (left < 16) left = 16;

      setStyle({ top, left });
      setReady(true);
    };

    assignPosition();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(assignPosition);
      observer.observe(node);
      observer.observe(anchor);
    }

    window.addEventListener("scroll", assignPosition, true);
    window.addEventListener("resize", assignPosition);

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", assignPosition, true);
      window.removeEventListener("resize", assignPosition);
    };
  }, [anchor]);

  useEffect(() => {
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (isElementWithin(target, popoverRef.current || undefined)) return;
      if (isElementWithin(target, anchor)) return;
      onClose();
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const container = popoverRef.current;
        if (!container) return;
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => !el.hasAttribute("disabled"));

        if (!focusables.length) {
          event.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (active === first || !container.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchor, onClose]);

  useLayoutEffect(() => {
    const container = popoverRef.current;
    if (!container) return;
    const focusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable || container).focus({ preventScroll: true });
  }, []);

  return createPortal(
    <div
      ref={popoverRef}
      className="day-popover"
      style={{
        top: style.top,
        left: style.left,
        visibility: ready ? "visible" : "hidden",
        opacity: ready ? 1 : 0,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={contentProps.headerId}
      tabIndex={-1}
    >
      <DayOverlayContent onClose={onClose} {...contentProps} />
    </div>,
    document.body
  );
};

interface DaySheetProps extends DayOverlayContentProps {
  onClose: () => void;
}

const DaySheet: React.FC<DaySheetProps> = ({ onClose, ...contentProps }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const translateRef = useRef(0);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useLayoutEffect(() => {
    const container = sheetRef.current;
    if (!container) return;
    const focusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable || container).focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const container = sheetRef.current;
        if (!container) return;
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => !el.hasAttribute("disabled"));

        if (!focusables.length) {
          event.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (active === first || !container.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    startYRef.current = event.touches[0]?.clientY ?? null;
    translateRef.current = 0;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (startYRef.current === null || !sheetRef.current) return;
    const currentY = event.touches[0]?.clientY ?? 0;
    const delta = currentY - startYRef.current;
    if (delta < 0) return;
    translateRef.current = delta;
    sheetRef.current.style.transform = `translateY(${delta}px)`;
  };

  const handleTouchEnd = () => {
    if (!sheetRef.current) return;
    const delta = translateRef.current;
    sheetRef.current.style.transform = "";
    startYRef.current = null;
    translateRef.current = 0;
    if (delta > 120) {
      onClose();
    }
  };

  const handleBackdrop = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="day-sheet-backdrop" role="presentation" onMouseDown={handleBackdrop} onClick={handleBackdrop}>
      <div
        ref={sheetRef}
        className="day-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={contentProps.headerId}
        tabIndex={-1}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="day-sheet-grabber" aria-hidden />
        <DayOverlayContent onClose={onClose} {...contentProps} />
      </div>
    </div>,
    document.body
  );
};

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
  onWrapperClick,
}) => {
  const navigate = useNavigate();
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
  const [wrapperHover, setWrapperHover] = useState(false);
  const lastInteractiveRectRef = useRef<DOMRect | null>(null);

  const {
    anchor: overlayAnchor,
    date: overlayDate,
    dayKey: overlayDayKey,
    isOpen: isDayOverlayOpen,
    isMobile,
    open: openDayOverlay,
    close: closeDayOverlayInternal,
  } = useDayOverlay();
  const lastActiveDayRef = useRef<HTMLButtonElement | null>(null);

  const closeDayOverlay = useCallback(
    (options?: { focus?: boolean }) => {
      const wasOpen = isDayOverlayOpen;
      closeDayOverlayInternal();
      if (!wasOpen || options?.focus === false) return;
      if (lastActiveDayRef.current) {
        lastActiveDayRef.current.focus({ preventScroll: true });
      }
    },
    [closeDayOverlayInternal, isDayOverlayOpen]
  );

  const updateWrapperHover = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (isDayOverlayOpen) {
        lastInteractiveRectRef.current = null;
        setWrapperHover(false);
        return;
      }

      const target = event.target as Element | null;
      const interactiveEl = target?.closest(WRAPPER_INTERACTIVE_SELECTOR) as HTMLElement | null;

      if (interactiveEl) {
        const rect = interactiveEl.getBoundingClientRect();
        lastInteractiveRectRef.current = new DOMRect(
          rect.left - INTERACTIVE_SAFE_PAD,
          rect.top - INTERACTIVE_SAFE_PAD,
          rect.width + INTERACTIVE_SAFE_PAD * 2,
          rect.height + INTERACTIVE_SAFE_PAD * 2
        );
        setWrapperHover(false);
        return;
      }

      const safeRect = lastInteractiveRectRef.current;
      if (safeRect) {
        const { clientX, clientY } = event;
        if (
          clientX >= safeRect.left &&
          clientX <= safeRect.right &&
          clientY >= safeRect.top &&
          clientY <= safeRect.bottom
        ) {
          setWrapperHover(false);
          return;
        }
      }

      lastInteractiveRectRef.current = null;
      setWrapperHover(true);
    },
    [isDayOverlayOpen]
  );

  const handleWrapperMouseEnter = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      updateWrapperHover(event);
    },
    [updateWrapperHover]
  );

  const handleWrapperMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      updateWrapperHover(event);
    },
    [updateWrapperHover]
  );

  const handleWrapperMouseLeave = useCallback(() => {
    lastInteractiveRectRef.current = null;
    setWrapperHover(false);
  }, []);

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

  const overlayEvents = overlayDayKey ? eventsByDate[overlayDayKey] || [] : [];
  const overlayDateLabel = overlayDate ? formatDateLabel(overlayDate) : "";
  const overlayHeaderId = useMemo(
    () => (overlayDayKey ? `project-calendar-day-${overlayDayKey}` : "project-calendar-day"),
    [overlayDayKey]
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

      notify("success", "Saved");
      closeDayOverlay();


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

  const openAddEventModal = useCallback((
    e?: ReactMouseEvent<HTMLButtonElement>,
    dateKeyParam?: string
  ) => {
    e?.stopPropagation();
    e?.preventDefault();
    closeDayOverlay({ focus: false });
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
    const key = dateKeyParam || getDateKey(selectedDate) || "";
    const parsed = safeParse(key);
    if (parsed) {
      setSelectedDate(parsed);
    }
    setStartDateInput(key);
    setEndDateInput(key);
    setShowModal(true);
  }, [closeDayOverlay, selectedDate, setEventDesc, setEventHours, setEditId, setCreateLineItem, setCategory, setElementKey, setElementId, setQuantity, setUnit, setBudgetedCost, setMarkup, setFinalCost, setSelectedDate, setStartDateInput, setEndDateInput, setShowModal]);

  const handleWrapperClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (showModal) return;
    if (isDayOverlayOpen) {
      closeDayOverlay();
      return;
    }
    if (ignoreNextWrapperClickRef.current) {
      ignoreNextWrapperClickRef.current = false;
      return;
    }

    const target = e.target as Node | null;
    if (target instanceof Element && target.closest(WRAPPER_INTERACTIVE_SELECTOR)) {
      return;
    }

    if (onWrapperClick) {
      onWrapperClick();
      return;
    }

    navigate("/dashboard/calendar");
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

  const openEditEventModal = useCallback((id: string) => {
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
  }, [events, selectedDate, budgetItems, setSelectedDate, setEventDesc, setEventHours, setStartDateInput, setEndDateInput, setEditId, setCreateLineItem, setCategory, setElementKey, setElementId, setQuantity, setUnit, setBudgetedCost, setMarkup, setFinalCost, setShowModal]);

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

  const handleDayOpen = useCallback(
    (
      anchor: HTMLButtonElement,
      { date, dayKey }: { date: Date; dayKey: string }
    ) => {
      if (!dayKey) return;

      if (isDayOverlayOpen && overlayDayKey === dayKey) {
        closeDayOverlay();
        return;
      }

      handleDateSelection(date);
      userNavigatedRef.current = true;
      lastActiveDayRef.current = anchor;
      openDayOverlay(anchor, date, dayKey);
      if (isMobile) {
        setHoverDate(null);
      }
      trackCalendarDay("open", {
        date: dayKey,
        projectId: project?.projectId,
      });
    },
    [
      closeDayOverlay,
      handleDateSelection,
      isDayOverlayOpen,
      isMobile,
      openDayOverlay,
      overlayDayKey,
      project?.projectId,
    ]
  );

  const handleDeleteEvent = useCallback(async (id: string) => {
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
  }, [events, setEvents, setDescOptions, extractDescOptions, project.projectId, ws, activeProject?.title, user?.firstName, user?.userId]);

  const handleOverlayNew = useCallback(() => {
    const key = overlayDayKey || getDateKey(selectedDate);
    if (!key) return;
    trackCalendarDay("create", {
      date: key,
      projectId: project?.projectId,
    });
    openAddEventModal(undefined, key);
  }, [overlayDayKey, openAddEventModal, project?.projectId, selectedDate]);

  const handleOverlayEdit = useCallback(
    (event: TimelineEvent) => {
      if (!event?.id) return;
      trackCalendarDay("edit", {
        date: event.date,
        projectId: project?.projectId,
        eventId: event.id,
      });
      closeDayOverlay({ focus: false });
      openEditEventModal(event.id);
    },
    [closeDayOverlay, openEditEventModal, project?.projectId]
  );

  const handleOverlayDelete = useCallback(
    (event: TimelineEvent) => {
      if (!event?.id) return;
      const label = event.description ? `"${event.description}"` : "this event";
      const confirmed = window.confirm(`Delete ${label}?`);
      if (!confirmed) return;
      handleDeleteEvent(event.id);
    },
    [handleDeleteEvent]
  );

  return (
    <div
      className={`dashboard-item project-calendar-wrapper${wrapperHover ? " calendar-card-hover" : ""}`}
      onClick={handleWrapperClick}
      onMouseEnter={handleWrapperMouseEnter}
      onMouseMove={handleWrapperMouseMove}
      onMouseLeave={handleWrapperMouseLeave}
    >

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
                    const eventCount = dayEvents.length;
                    const isSelected = selectedKey === key;
                    const isToday = todayKey === key;
                    const isFlashing = flashKey === key;
                    const isHovered = hoverKey === key;
                    const inRange = rangeSet.has(key);
                    const totalHours = dayEvents.reduce(
                      (sum, ev) => sum + Number(ev.hours || 0),
                      0
                    );
                    const label = formatDateLabel(date);

                    return (
                      <div key={key} className="calendar-day-wrapper">
                        <CalendarDayButton
                          date={date}
                          dayKey={key}
                          inMonth={inMonth}
                          isSelected={isSelected}
                          isToday={isToday}
                          isFlashing={isFlashing}
                          inRange={inRange}
                          hasEvents={eventCount > 0}
                          hasBadge={eventCount > 0}
                          label={`Events on ${label}`}
                          onOpen={handleDayOpen}
                          onMouseEnter={!isMobile ? () => queueHover(date) : undefined}
                          onMouseLeave={!isMobile ? queueHoverClear : undefined}
                        >
                          <div className="tile-date-number">{date.getDate()}</div>

                          <EventPill count={eventCount} color={projectColor} />

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
                        </CalendarDayButton>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>


        {isDayOverlayOpen && overlayAnchor && overlayDate && overlayDayKey && (
          isMobile ? (
            <DaySheet
              headerId={overlayHeaderId}
              dateLabel={overlayDateLabel}
              events={overlayEvents}
              onClose={() => closeDayOverlay()}
              onNew={handleOverlayNew}
              onEdit={handleOverlayEdit}
              onDelete={handleOverlayDelete}
            />
          ) : (
            <DayPopover
              anchor={overlayAnchor}
              headerId={overlayHeaderId}
              dateLabel={overlayDateLabel}
              events={overlayEvents}
              onClose={() => closeDayOverlay()}
              onNew={handleOverlayNew}
              onEdit={handleOverlayEdit}
              onDelete={handleOverlayDelete}
            />
          )
        )}

      </div>

      <Modal
        isOpen={showModal}
        onRequestClose={(event?: ReactMouseEvent) => {
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
