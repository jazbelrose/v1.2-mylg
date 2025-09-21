import React from "react";
import "./calendar-overview-card.css";
import CalendarBase, { CalendarBaseProps } from "./calendar/CalendarBase";

export type { Project, TimelineEvent } from "./calendar/CalendarBase";

export interface CalendarOverviewCardProps
  extends Omit<CalendarBaseProps, "wrapperClassName" | "dayHeaderIdPrefix" | "showEventList"> {
  showEventList?: boolean;
}

const CalendarOverviewCard: React.FC<CalendarOverviewCardProps> = ({
  showEventList = true,
  ...props
}) => {
  return (
    <CalendarBase
      {...props}
      showEventList={showEventList}
      wrapperClassName="calendar-overview-card-wrapper"
      dayHeaderIdPrefix="calendar-overview-card-day"
    />
  );
};

export default CalendarOverviewCard;
