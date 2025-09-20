import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { withAlpha } from "@/shared/utils/colorUtils";

type EventPillProps = {
  count?: number;
  color?: string;
  className?: string;
};

function isHexColor(value: string) {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value.trim());
}

const DEFAULT_COLOR = "#FA3356";

const EventPill: React.FC<EventPillProps> = ({ count = 0, color, className }) => {
  if (!count || count <= 0) {
    return null;
  }

  const trimmed = color?.trim();
  const baseColor = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_COLOR;
  const fillColor = isHexColor(baseColor) ? withAlpha(baseColor, 0.1) : "rgba(255, 255, 255, 0.08)";

  const label = `${count} event${count === 1 ? "" : "s"}`;

  return (
    <span
      className={["event-pill", className].filter(Boolean).join(" ")}
      style={{
        color: baseColor,
        backgroundColor: fillColor,
        borderColor: baseColor,
      }}
      aria-label={label}
    >
      <FontAwesomeIcon icon={faClock} aria-hidden className="event-pill__icon" />
      <span className="event-pill__count">{count}</span>
    </span>
  );
};

export default EventPill;
