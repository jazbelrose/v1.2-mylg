import React from "react";
import "./project-calendar.css";
import CalendarBase, { CalendarBaseProps } from "@/dashboard/project/components/Shared/calendar/CalendarBase";

export type { Project, TimelineEvent } from "@/dashboard/project/components/Shared/calendar/CalendarBase";

export type ProjectCalendarProps = Omit<CalendarBaseProps, "wrapperClassName" | "dayHeaderIdPrefix" | "showEventList">;

const ProjectCalendar: React.FC<ProjectCalendarProps> = (props) => {
  return (
    <CalendarBase
      {...props}
      wrapperClassName="project-calendar-wrapper"
      dayHeaderIdPrefix="project-calendar-day"
    />
  );
};

export default ProjectCalendar;
