import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
} from "recharts";
import type { TooltipProps } from "recharts";

interface SectorProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}

import { getColor } from "@/shared/utils/colorUtils";

export interface BudgetDonutSlice {
  id: string;
  label: string;
  value: number;
}

interface InternalSlice extends BudgetDonutSlice {
  color: string;
}

export type BudgetDonutDatum = InternalSlice;

export interface BudgetDonutProps {
  data: BudgetDonutSlice[];
  total: number;
  totalFormatter?: (value: number) => string;
  formatTooltip?: (slice: BudgetDonutDatum) => string;
  palette?: string[];
  ariaLabel?: string;
  explodeOnHover?: boolean;
  explodeOnClick?: boolean;
  className?: string;
  clampTooltipToViewport?: boolean;
}

const srOnlyStyles: React.CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  width: "1px",
  whiteSpace: "nowrap",
};

const centerButtonBaseBackground = "rgba(17, 17, 17, 0.6)";
const centerButtonBaseShadow = "0 8px 20px rgba(17, 17, 17, 0.45)";

const centerButtonStyles: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
  border: "none",
  background: "transparent",
  borderRadius: "50%",
  padding: "12px",
  width: "min(50%, 120px)",
  aspectRatio: "1 / 1",
  boxSizing: "border-box",
  textAlign: "center",
  color: "inherit",
  cursor: "pointer",
  pointerEvents: "auto",
  transition: "background 150ms ease, box-shadow 150ms ease",


};

const centerValueStyles: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
};

const centerPopoverStyles: React.CSSProperties = {
  position: "fixed",
  transform: "translate(-50%, -50%)",
  background: "rgba(17, 17, 17, 0.6)", // Semi-transparent for frosted effect
  color: "#f8fafc",
  borderRadius: "16px",
  padding: "16px 18px",
  boxShadow: "0 20px 45px rgba(15, 23, 42, 0.45)",
  minWidth: "220px",
  maxWidth: "260px",
  zIndex: 20,
  pointerEvents: "auto",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  border: "2px solid rgba(148, 163, 184, 0.25)",
};
const centerPopoverHeaderStyles: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: "10px",
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  opacity: 0.85,
};

const centerPopoverListStyles: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const centerPopoverRowStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
};

const centerPopoverLabelGroupStyles: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
};

const centerPopoverSwatchStyles: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  flexShrink: 0,
};

const centerPopoverPercentStyles: React.CSSProperties = {
  flexShrink: 0,
  fontVariantNumeric: "tabular-nums",
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "rgba(226, 232, 240, 0.85)",
};

const tooltipStyles: React.CSSProperties = {
  background: "rgba(17, 17, 17, 0.8)", // Semi-transparent for frosted effect
  color: "#f8fafc",
  borderRadius: "6px",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  padding: "6px 10px",
  fontSize: "0.75rem",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.45)",
  backdropFilter: "blur(10px)", // Add blur for frosted effect
  WebkitBackdropFilter: "blur(10px)", // Safari support
};

type TooltipPosition = { x: number; y: number };

type SafeAreaInsets = { top: number; right: number; bottom: number; left: number };

const ZERO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const measureSafeAreaInsets = (): SafeAreaInsets => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return ZERO_INSETS;
  }

  const probe = document.createElement("div");
  probe.setAttribute("data-budget-donut-safe-area", "true");
  Object.assign(probe.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    visibility: "hidden",
    pointerEvents: "none",
    zIndex: "-1",
    paddingTop: "env(safe-area-inset-top)",
    paddingRight: "env(safe-area-inset-right)",
    paddingBottom: "env(safe-area-inset-bottom)",
    paddingLeft: "env(safe-area-inset-left)",
  } as React.CSSProperties);

  document.body.appendChild(probe);
  const styles = window.getComputedStyle(probe);
  const parse = (value: string): number => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const insets: SafeAreaInsets = {
    top: parse(styles.paddingTop),
    right: parse(styles.paddingRight),
    bottom: parse(styles.paddingBottom),
    left: parse(styles.paddingLeft),
  };
  document.body.removeChild(probe);
  return insets;
};

interface BudgetDonutTooltipContentProps extends TooltipProps<number, string> {
  formatTooltip?: (slice: BudgetDonutDatum) => string;
  clampToViewport: boolean;
  onPositionChange?: (position: TooltipPosition | undefined) => void;
}

const clampValue = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

const BudgetDonutTooltipContent: React.FC<BudgetDonutTooltipContentProps> = ({
  active,
  payload,
  viewBox,
  formatTooltip,
  clampToViewport,
  onPositionChange,
}) => {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [viewportVersion, setViewportVersion] = useState(0);

  const datum = useMemo(
    () => (payload && payload.length > 0 ? (payload[0]?.payload as BudgetDonutDatum | undefined) : undefined),
    [payload]
  );

  const text = useMemo(() => {
    if (!datum) return "";
    return formatTooltip
      ? formatTooltip(datum)
      : `${datum.label}: ${Math.round(datum.value).toLocaleString()}`;
  }, [datum, formatTooltip]);

  const safeAreaInsets = useMemo(
    () => (clampToViewport ? measureSafeAreaInsets() : ZERO_INSETS),
    [clampToViewport, viewportVersion]
  );

  useEffect(() => {
    if (!clampToViewport || !active) return undefined;
    if (typeof window === "undefined") return undefined;

    const handleViewportChange = () => {
      setViewportVersion((version) => version + 1);
    };

    const viewport = window.visualViewport;
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    viewport?.addEventListener("resize", handleViewportChange);
    viewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      viewport?.removeEventListener("resize", handleViewportChange);
      viewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, [clampToViewport, active]);

  useEffect(() => {
    if (!clampToViewport || active) return undefined;
    onPositionChange?.(undefined);
    return undefined;
  }, [clampToViewport, active, onPositionChange]);

  useLayoutEffect(() => {
    if (!clampToViewport) return;
    if (!active || !datum || !viewBox) {
      onPositionChange?.(undefined);
      return;
    }
    if (typeof window === "undefined") {
      onPositionChange?.(undefined);
      return;
    }

    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const wrapper = tooltipEl.closest<HTMLElement>(".recharts-wrapper");
    if (!wrapper) {
      onPositionChange?.(undefined);
      return;
    }

    const tooltipRect = tooltipEl.getBoundingClientRect();
    const containerRect = wrapper.getBoundingClientRect();

    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;

    const baseLeft = containerRect.left + centerX - tooltipRect.width / 2;
    const baseTop = containerRect.top + centerY - tooltipRect.height / 2;

    const viewport = window.visualViewport;
    const viewportOffsetLeft = viewport?.offsetLeft ?? 0;
    const viewportOffsetTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;

    const margin = 16;

    const minLeft = viewportOffsetLeft + safeAreaInsets.left + margin;
    const maxLeft = viewportOffsetLeft + viewportWidth - safeAreaInsets.right - margin - tooltipRect.width;
    const minTop = viewportOffsetTop + safeAreaInsets.top + margin;
    const maxTop = viewportOffsetTop + viewportHeight - safeAreaInsets.bottom - margin - tooltipRect.height;

    const clampedLeft = clampValue(baseLeft, minLeft, maxLeft);
    const clampedTop = clampValue(baseTop, minTop, maxTop);

    const relativeX = clampedLeft - containerRect.left;
    const relativeY = clampedTop - containerRect.top;

    if (Number.isFinite(relativeX) && Number.isFinite(relativeY)) {
      onPositionChange?.({ x: relativeX, y: relativeY });
    }
  }, [
    clampToViewport,
    active,
    datum,
    viewBox,
    onPositionChange,
    safeAreaInsets,
    text,
  ]);

  if (!active || !datum) {
    return null;
  }

  return (
    <div ref={tooltipRef} style={tooltipStyles} role="presentation">
      {text}
    </div>
  );
};
const renderActiveShape = (props: SectorProps) => {
  const outerRadius = typeof props.outerRadius === "number" ? props.outerRadius : 0;
  return <Sector {...props} outerRadius={outerRadius + 8} />;
};

const slicesAreEqual = (a: BudgetDonutSlice[], b: BudgetDonutSlice[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id || a[i].value !== b[i].value || a[i].label !== b[i].label) {
      return false;
    }
  }
  return true;
};

const BudgetDonut: React.FC<BudgetDonutProps> = ({
  data,
  total,
  totalFormatter = (value) => value.toLocaleString(),
  formatTooltip,
  palette,
  ariaLabel = "Budget allocation donut chart",
  explodeOnHover = true,
  explodeOnClick = true,
  className,
  clampTooltipToViewport,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [centerPopoverPosition, setCenterPopoverPosition] = useState<
    | {
        top: number;
        left: number;
      }
    | null
  >(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | undefined>(undefined);

  const centerButtonRef = useRef<HTMLButtonElement | null>(null);
  const centerPopoverRef = useRef<HTMLDivElement | null>(null);

  const shapedData = useMemo(() => {
    if (!Array.isArray(data)) return [] as InternalSlice[];
    const paletteArray = Array.isArray(palette) ? palette : [];
    const paletteLength = paletteArray.length;
    return data.map((slice, index) => ({
      ...slice,
      color: paletteLength > 0 ? paletteArray[index % paletteLength] : getColor(slice.id),
    }));
  }, [data, palette]);

  const stableDataRef = useRef<InternalSlice[]>([]);
  const signatureRef = useRef<string | null>(null);

  const stableData = useMemo(() => {
    const signature = shapedData
      .map((slice) => `${slice.id}:${slice.value}`)
      .join("|");

    if (signatureRef.current === signature && stableDataRef.current.length) {
      const current = stableDataRef.current;
      for (let i = 0; i < shapedData.length; i += 1) {
        const source = shapedData[i];
        if (current[i]) {
          current[i].label = source.label;
          current[i].color = source.color;
          current[i].id = source.id;
          current[i].value = source.value;
        } else {
          current[i] = { ...source };
        }
      }
      current.length = shapedData.length;
      return current;
    }

    const next = shapedData.map((slice) => ({ ...slice }));
    signatureRef.current = signature;
    stableDataRef.current = next;
    return next;
  }, [shapedData]);

  const activeIndex = lockedIndex ?? hoverIndex ?? undefined;

  const dataSignature = useMemo(
    () => stableData.map((slice) => `${slice.id}:${slice.value}`).join("|"),
    [stableData]
  );

  const handleMouseEnter = useCallback(
    (_: unknown, index: number) => {
      if (!explodeOnHover) return;
      setHoverIndex(index);
    },
    [explodeOnHover]
  );

  const handleMouseLeave = useCallback(() => {
    if (!explodeOnHover) return;
    setHoverIndex(null);
  }, [explodeOnHover]);

  const handleSliceClick = useCallback(
    (_: unknown, index: number) => {
      if (!explodeOnClick) return;
      setLockedIndex((prev) => (prev === index ? null : index));
    },
    [explodeOnClick]
  );

  const clampTooltip = Boolean(clampTooltipToViewport);

  const handleTooltipPositionChange = useCallback(
    (next: TooltipPosition | undefined) => {
      setTooltipPosition((prev) => {
        if (!next) {
          return undefined;
        }
        if (prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5) {
          return prev;
        }
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (!clampTooltip) {
      setTooltipPosition(undefined);
    }
  }, [clampTooltip]);

  const formattedTotal = useMemo(() => totalFormatter(total), [total, totalFormatter]);

  const percentageFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }),
    []
  );

  const updateCenterPopoverPosition = useCallback(() => {
    const button = centerButtonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const baseTop = rect.top + rect.height / 2;
    const baseLeft = rect.left + rect.width / 2;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;

    const clampPosition = () => {
      let top = baseTop;
      let left = baseLeft;

      const popover = centerPopoverRef.current;
      if (popover) {
        const halfWidth = popover.offsetWidth / 2;
        const halfHeight = popover.offsetHeight / 2;

        const minLeft = margin + halfWidth;
        const maxLeft = viewportWidth - margin - halfWidth;
        const minTop = margin + halfHeight;
        const maxTop = viewportHeight - margin - halfHeight;

        left = Math.min(Math.max(left, minLeft), maxLeft);
        top = Math.min(Math.max(top, minTop), maxTop);
      } else {
        left = Math.min(Math.max(left, margin), viewportWidth - margin);
        top = Math.min(Math.max(top, margin), viewportHeight - margin);
      }

      setCenterPopoverPosition({
        top,
        left,
      });
    };

    if (centerPopoverRef.current) {
      clampPosition();
    } else if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(clampPosition);
    } else {
      clampPosition();
    }
  }, []);

  const openCenterPopover = useCallback(() => {
    setIsCenterOpen(true);
    updateCenterPopoverPosition();
  }, [updateCenterPopoverPosition]);

  const closeCenterPopover = useCallback(() => {
    setIsCenterOpen(false);
    setCenterPopoverPosition(null);
  }, []);

  const handleCenterMouseEnter = useCallback(() => {
    openCenterPopover();
  }, [openCenterPopover]);

  const handleCenterMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && centerPopoverRef.current?.contains(nextTarget)) {
        return;
      }
      closeCenterPopover();
    },
    [closeCenterPopover]
  );

  const handleCenterFocus = useCallback(() => {
    openCenterPopover();
  }, [openCenterPopover]);

  const handleCenterBlur = useCallback(() => {
    closeCenterPopover();
  }, [closeCenterPopover]);

  const handleCenterPopoverMouseEnter = useCallback(() => {
    openCenterPopover();
  }, [openCenterPopover]);

  const handleCenterPopoverMouseLeave = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && centerButtonRef.current?.contains(nextTarget)) {
        return;
      }
      closeCenterPopover();
    },
    [closeCenterPopover]
  );

  const handleCenterPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== "touch") return;
      event.preventDefault();
      event.stopPropagation();
      openCenterPopover();
    },
    [openCenterPopover]
  );

  useEffect(() => {
    if (!isCenterOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        !target ||
        centerButtonRef.current?.contains(target) ||
        centerPopoverRef.current?.contains(target)
      ) {
        return;
      }
      closeCenterPopover();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCenterPopover();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCenterPopover, isCenterOpen]);

  useEffect(() => {
    if (!isCenterOpen) return;

    updateCenterPopoverPosition();

    const handleReposition = () => {
      updateCenterPopoverPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isCenterOpen, updateCenterPopoverPosition]);

  useEffect(() => {
    closeCenterPopover();
  }, [dataSignature, total, closeCenterPopover]);

  const handleContainerPointerLeave = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!explodeOnHover) return;
      const nextTarget = event.relatedTarget as Node | null;
      if (nextTarget && containerRef.current?.contains(nextTarget)) {
        return;
      }
      setHoverIndex(null);
    },
    [explodeOnHover]
  );

  const popoverContent =
    typeof document !== "undefined" && isCenterOpen && centerPopoverPosition
      ? createPortal(
          <div
            ref={centerPopoverRef}
            style={{
              ...centerPopoverStyles,
              top: centerPopoverPosition.top,
              left: centerPopoverPosition.left,
            }}
            role="dialog"
            aria-label="Budget allocation breakdown"
            onMouseEnter={handleCenterPopoverMouseEnter}
            onMouseLeave={handleCenterPopoverMouseLeave}
          >
            <div style={centerPopoverHeaderStyles}>Budget allocation</div>
            {stableData.length ? (
              <div style={centerPopoverListStyles}>
                {stableData.map((slice) => {
                  const ratio = total > 0 ? slice.value / total : 0;
                  return (
                    <div key={slice.id} style={centerPopoverRowStyles}>
                      <div style={centerPopoverLabelGroupStyles}>
                        <span
                          aria-hidden="true"
                          style={{
                            ...centerPopoverSwatchStyles,
                            backgroundColor: slice.color,
                          }}
                        />
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "0.8rem",
                          }}
                        >
                          {slice.label}
                        </span>
                      </div>
                      <span style={centerPopoverPercentStyles}>
                        {total > 0 ? percentageFormatter.format(ratio) : "0%"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontStyle: "italic", opacity: 0.75, fontSize: "0.8rem" }}>
                No categories available
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={containerRef}
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{ width: "100%", height: "100%", position: "relative", overflow: "visible" }}
      onPointerLeave={handleContainerPointerLeave}
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={stableData}
            dataKey="value"
            nameKey="label"
            innerRadius="52%"
            outerRadius="90%"
            paddingAngle={1}
            cornerRadius={2}
            isAnimationActive
            animationDuration={350}
            activeIndex={activeIndex as number | undefined}
            activeShape={renderActiveShape as never}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleSliceClick}
            cursor="pointer"
          >
            {stableData.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.color}
                stroke="var(--budget-chart-border, #0f172a)"
                strokeWidth={entry.value > 0 ? 1 : 0}
              />
            ))}
          </Pie>
          <Tooltip
            content={
              <BudgetDonutTooltipContent
                formatTooltip={formatTooltip}
                clampToViewport={clampTooltip}
                onPositionChange={clampTooltip ? handleTooltipPositionChange : undefined}
              />
            }
            cursor={{ fill: "rgba(255,255,255,0.08)" }}
            wrapperStyle={{ zIndex: 10 }}
            position={clampTooltip ? tooltipPosition : undefined}
          />
        </PieChart>
      </ResponsiveContainer>

      <button
        ref={centerButtonRef}
        type="button"
        style={{
          ...centerButtonStyles,
          background: isCenterOpen ? "#111" : centerButtonBaseBackground,
          boxShadow: isCenterOpen
            ? "0 12px 32px #111"
            : centerButtonBaseShadow,
        }}
        onMouseEnter={handleCenterMouseEnter}
        onMouseLeave={handleCenterMouseLeave}
        onFocus={handleCenterFocus}
        onBlur={handleCenterBlur}
        onPointerDown={handleCenterPointerDown}
        aria-label="View budget allocation"
        aria-haspopup="dialog"
        aria-expanded={isCenterOpen}
      >
        <span style={centerValueStyles}>{formattedTotal}</span>
      </button>

      {popoverContent}

      <table style={srOnlyStyles}>
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {stableData.map((slice) => (
            <tr key={slice.id}>
              <td>{slice.label}</td>
              <td>{slice.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(BudgetDonut, (prev, next) => {
  if (prev.total !== next.total) return false;
  if (prev.totalFormatter !== next.totalFormatter) return false;
  if (prev.formatTooltip !== next.formatTooltip) return false;
  if (prev.ariaLabel !== next.ariaLabel) return false;
  if (prev.explodeOnHover !== next.explodeOnHover) return false;
  if (prev.explodeOnClick !== next.explodeOnClick) return false;
  if (prev.palette !== next.palette) return false;
  if (!slicesAreEqual(prev.data, next.data)) return false;
  return true;
});

