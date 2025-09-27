import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, endOfWeek, startOfWeek } from "@/dashboard/home/utils/dateUtils";
import { DayPopover, DaySheet } from "./DayOverlay";
import { useCalendarController } from "./useCalendarController";
import type { CalendarBaseProps } from "./CalendarBase";
import { getDateKey, safeParse } from "./utils";
import "./project-week-widget.css";
import CalendarGrid from "./CalendarGrid";

type ProjectWeekWidgetProps = Omit<CalendarBaseProps, "wrapperClassName" | "dayHeaderIdPrefix"> & {
  className?: string;
};

type WeekRow = Array<{ date: Date; key: string; inMonth: boolean }>;

const ProjectWeekWidget: React.FC<ProjectWeekWidgetProps> = ({
  project,
  initialFlashDate,
  onDateSelect,
  onWrapperClick,
  showEventList = false,
  className = "",
}) => {
  const controller = useCalendarController({
    project,
    initialFlashDate,
    onDateSelect,
    onWrapperClick,
    dayHeaderIdPrefix: "project-week-widget-day",
    showEventList,
  });

  const {
    wrapperHandlers,
    startDate,
    endDate,
    projectColor,
    selectedKey,
    todayKey,
    flashKey,
    rangeSet,
    eventsByDate,
    openDay,
    overlayState,
    modal,
    weekdayLabels,
  } = controller;

  const [weekOf, setWeekOf] = useState<Date>(() => {
    return safeParse(initialFlashDate) || safeParse(selectedKey) || new Date();
  });

  useEffect(() => {
    const parsed = safeParse(selectedKey);
    if (!parsed) return;
    const currentKey = getDateKey(weekOf);
    const nextKey = getDateKey(parsed);
    if (currentKey !== nextKey) {
      setWeekOf(parsed);
    }
  }, [selectedKey, weekOf]);

  const handleWeekChange = useCallback(
    (weekStartDate: Date) => {
      const currentStart = startOfWeek(weekOf);
      const offset = Math.max(
        0,
        Math.min(6, Math.round((weekOf.getTime() - currentStart.getTime()) / 86400000))
      );
      const target = addDays(weekStartDate, offset);
      setWeekOf(target);
    },
    [weekOf]
  );

  const weekWidgetClass = ["project-week-widget", className].filter(Boolean).join(" ");

  const weekStart = useMemo(() => startOfWeek(weekOf), [weekOf]);
  const weekEnd = useMemo(() => endOfWeek(weekOf), [weekOf]);
  const weekTitle = useMemo(() => {
    const startLabel = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endLabel = weekEnd.toLocaleDateString(undefined, {
      month: weekStart.getMonth() === weekEnd.getMonth() ? undefined : "short",
      day: "numeric",
    });
    const yearLabel = weekEnd.toLocaleDateString(undefined, { year: "numeric" });
    return `${startLabel} – ${endLabel} ${yearLabel}`;
  }, [weekStart, weekEnd]);

  const weekDays = useMemo<WeekRow>(() => {
    const row: WeekRow = [];
    for (let index = 0; index < 7; index += 1) {
      const date = addDays(weekStart, index);
      const key = getDateKey(date);
      if (!key) continue;
      row.push({
        date,
        key,
        inMonth: date.getMonth() === weekOf.getMonth(),
      });
    }
    return row;
  }, [weekStart, weekOf]);

  const handlePrevWeek = useCallback(() => {
    const prev = addDays(weekStart, -7);
    handleWeekChange(prev);
  }, [handleWeekChange, weekStart]);

  const handleNextWeek = useCallback(() => {
    const next = addDays(weekStart, 7);
    handleWeekChange(next);
  }, [handleWeekChange, weekStart]);

  return (
    <div
      className={weekWidgetClass}
      onClick={wrapperHandlers.onClick}
      onMouseEnter={wrapperHandlers.onMouseEnter}
      onMouseMove={wrapperHandlers.onMouseMove}
      onMouseLeave={wrapperHandlers.onMouseLeave}
      role="presentation"
    >
      <div className="project-week-widget-inner">
        <div className="calendar-content">
          <CalendarGrid
            monthTitle={weekTitle}
            weekdayLabels={weekdayLabels}
            weeks={[weekDays]}
            startDate={startDate}
            endDate={endDate}
            projectColor={projectColor}
            selectedKey={selectedKey}
            todayKey={todayKey}
            flashKey={flashKey}
            rangeSet={rangeSet}
            eventsByDate={eventsByDate}
            onDayOpen={openDay}
            onPrevMonth={handlePrevWeek}
            onNextMonth={handleNextWeek}
          />
        </div>
      </div>

      {overlayState.isOpen && overlayState.dayKey && (
        overlayState.isMobile ? (
          <DaySheet
            headerId={overlayState.headerId}
            dateLabel={overlayState.dateLabel}
            events={overlayState.events}
            onClose={overlayState.close}
            onNew={overlayState.onNew}
            onEdit={overlayState.onEdit}
            onDelete={overlayState.onDelete}
          />
        ) : overlayState.anchor ? (
          <DayPopover
            anchor={overlayState.anchor}
            headerId={overlayState.headerId}
            dateLabel={overlayState.dateLabel}
            events={overlayState.events}
            onClose={() => overlayState.close()}
            onNew={overlayState.onNew}
            onEdit={overlayState.onEdit}
            onDelete={overlayState.onDelete}
          />
        ) : null
      )}

      {modal.component}
    </div>
  );
};

export default ProjectWeekWidget;
