import type { FC } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";

interface EventPillProps {
  count?: number;
  color?: string;
  className?: string;
}

const DEFAULT_COLOR = "#FA3356";
const DEFAULT_BACKGROUND = "rgba(250, 51, 86, 0.1)";

function hexToRgb(color: string): { r: number; g: number; b: number } | null {
  let value = color.trim();
  if (!value) return null;
  if (value.startsWith("#")) {
    value = value.slice(1);
  }
  if (value.length === 3) {
    value = value
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (value.length < 6) return null;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function toRgba(color?: string, alpha = 0.1): string {
  if (!color) return DEFAULT_BACKGROUND;
  const trimmed = color.trim();

  const rgb = hexToRgb(trimmed);
  if (rgb) {
    const { r, g, b } = rgb;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbMatch = trimmed.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbaMatch = trimmed.match(/^rgba\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return DEFAULT_BACKGROUND;
}

const EventPill: FC<EventPillProps> = ({ count = 0, color, className }) => {
  if (!count || count <= 0) {
    return null;
  }

  const baseColor = color?.trim() || DEFAULT_COLOR;
  const pillClassName = ["event-pill", className].filter(Boolean).join(" ");
  const backgroundColor = toRgba(baseColor, 0.1);
  const borderColor = baseColor;
  const textColor = baseColor;
  const label = `${count} event${count === 1 ? "" : "s"}`;

  return (
    <span
      className={pillClassName}
      style={{ backgroundColor, borderColor, color: textColor }}
      aria-label={label}
      title={label}
    >
      <FontAwesomeIcon icon={faClock} className="event-pill-icon" aria-hidden />
      <span className="event-pill-count">{count}</span>
    </span>
  );
};

export default EventPill;
