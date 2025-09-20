import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";

interface EventPillProps {
  count?: number;
  color?: string;
  className?: string;
}

function toAlphaColor(color: string | undefined, alpha: number): string {
  if (!color) {
    return `rgba(250, 51, 86, ${alpha})`;
  }

  const trimmed = color.trim();

  if (trimmed.startsWith("#")) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(",")
      .slice(0, 3)
      .map((part) => Number(part.trim()));

    if (parts.every((value) => Number.isFinite(value))) {
      const [r, g, b] = parts;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  return `rgba(250, 51, 86, ${alpha})`;
}

const EventPill: React.FC<EventPillProps> = ({ count = 0, color, className }) => {
  if (!count || count <= 0) {
    return null;
  }

  const tone = color && color.trim() ? color : "#FA3356";
  const fillColor = toAlphaColor(tone, 0.1);
  const pillClass = ["event-pill", className].filter(Boolean).join(" ");

  return (
    <div
      className={pillClass}
      style={{
        color: tone,
        borderColor: tone,
        backgroundColor: fillColor,
      }}
      aria-label={`${count} event${count === 1 ? "" : "s"}`}
    >
      <FontAwesomeIcon icon={faClock} aria-hidden />
      <span className="event-pill-count">{count}</span>
    </div>
  );
};

export default EventPill;
