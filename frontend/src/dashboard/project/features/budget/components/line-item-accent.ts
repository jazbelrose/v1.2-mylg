import type { CSSProperties } from "react";
import { getColor } from "@/shared/utils/colorUtils";

export interface AccentProjectLike {
  projectId?: string | number | null;
  color?: string | null;
}

const FALLBACK_ACCENT_COLOR = "#38BDF8";

const normalizeHexColor = (value: string): string | null => {
  const trimmed = value.trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return null;
  }

  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return trimmed.toUpperCase();
};

const rgbaFromHex = (hex: string, alpha: number): string => {
  const value = hex.startsWith("#") ? hex.slice(1) : hex;
  if (value.length !== 6) {
    return rgbaFromHex(FALLBACK_ACCENT_COLOR, alpha);
  }

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const resolveLineItemAccentHex = (source?: AccentProjectLike | null): string => {
  const provided =
    typeof source?.color === "string" && source.color.trim() !== ""
      ? normalizeHexColor(source.color)
      : null;

  if (provided) {
    return provided;
  }

  const generated = normalizeHexColor(getColor(String(source?.projectId ?? "budget")) ?? "");

  return generated ?? FALLBACK_ACCENT_COLOR;
};

export const buildLineItemAccentStyle = (accentHex: string): CSSProperties =>
  ({
    "--line-item-accent": accentHex,
    "--line-item-accent-soft": rgbaFromHex(accentHex, 0.18),
    "--line-item-accent-softer": rgbaFromHex(accentHex, 0.28),
    "--line-item-accent-border": rgbaFromHex(accentHex, 0.32),
    "--line-item-accent-glow": rgbaFromHex(accentHex, 0.24),
    "--line-item-accent-faint": rgbaFromHex(accentHex, 0.14),
    "--line-item-accent-muted": rgbaFromHex(accentHex, 0.62),
    "--line-item-accent-text": "rgba(247, 248, 252, 0.95)",
    "--line-item-button-text": "#05090f",
  }) as CSSProperties;

export const computeLineItemAccent = (source?: AccentProjectLike | null) => {
  const accentHex = resolveLineItemAccentHex(source);
  return { accentHex, style: buildLineItemAccentStyle(accentHex) };
};
