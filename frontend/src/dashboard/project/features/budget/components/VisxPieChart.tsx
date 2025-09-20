import React, { memo } from "react";
import type { PieArcDatum } from "@visx/shape";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { animated, useSpring, to as springTo, SpringValue } from "@react-spring/web";
import { useReducedMotion } from "framer-motion";

import { formatUSD } from "@/shared/utils/budgetUtils";
import { CHART_COLORS, generateSequentialPalette, getColor } from "@/shared/utils/colorUtils";
import { useData } from "@/app/contexts/useData";

const EXPLODE_PX = 8;
const ACTIVE_OFFSET = 6;
const ACTIVE_OFFSET_RATIO = 0.02;
const ACTIVE_OUTER_RADIUS_DELTA = 1;
const ACTIVE_INNER_RADIUS_DELTA = 1;

type PointerType = "mouse" | "touch" | "pen" | "unknown";

type ClampResult = { left: number; top: number };

declare global {
  interface Window {
    analytics?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      track: (event: string, payload: Record<string, any>) => void;
    };
  }
}

export type PieDatum = {
  name: string;
  value: number;
  // Allow extra fields if callers pass richer objects
  [key: string]: unknown;
};

type CenterLabelArgs = {
  activeDatum: PieDatum | null;
  total: number;
  percent: number | null;
};

const defaultCenterLabelRenderer = ({ activeDatum, total }: CenterLabelArgs) => {
  if (activeDatum) {
    return (
      <>
        <tspan x="0" dy="-0.2em">
          {String(activeDatum.name)}
        </tspan>
        <tspan x="0" dy="1.2em">
          {formatUSD(activeDatum.value)}
        </tspan>
      </>
    );
  }

  return (
    <>
      <tspan x="0" dy="-0.2em">
        Total
      </tspan>
      <tspan x="0" dy="1.2em">
        {formatUSD(total)}
      </tspan>
    </>
  );
};

function useIsCoarsePointer(): boolean {
  const getInitialValue = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia) {
      return window.matchMedia("(pointer: coarse)").matches;
    }
    return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
  }, []);

  const [isCoarse, setIsCoarse] = React.useState(getInitialValue);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(pointer: coarse)");
    const listener = (event: MediaQueryListEvent) => setIsCoarse(event.matches);

    if (query.addEventListener) {
      query.addEventListener("change", listener);
    } else {
      // Safari
      // eslint-disable-next-line deprecation/deprecation
      query.addListener(listener);
    }

    setIsCoarse(query.matches);

    return () => {
      if (query.removeEventListener) {
        query.removeEventListener("change", listener);
      } else {
        // Safari
        // eslint-disable-next-line deprecation/deprecation
        query.removeListener(listener);
      }
    };
  }, []);

  return isCoarse;
}

function formatPercent(value: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0,
    maximumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  });
  return formatter.format(value);
}

interface AnimatedArcProps {
  arc: PieArcDatum<PieDatum>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pie: any;
  color: string;
  showTooltip: (args: { tooltipData: PieDatum; tooltipLeft: number; tooltipTop: number }) => void;
  hideTooltip: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  clampTooltip: (x: number, y: number, tooltipWidth?: number, tooltipHeight?: number) => ClampResult;
  rafRef: React.MutableRefObject<number | null>;
  explodePx?: number;
  isActive?: boolean;
  reducedMotion?: boolean;
  tabIndex?: number;
  role?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  interactive?: boolean;
  shouldShowTooltip?: boolean;
  onActivate?: (pointerType: PointerType) => void;
  onDeactivate?: (pointerType: PointerType) => void;
  onToggle?: (pointerType: PointerType) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<SVGGElement>) => void;
  innerRef?: (node: SVGGElement | null) => void;
}

function AnimatedArc({
  arc,
  pie,
  color,
  showTooltip,
  hideTooltip,
  containerRef,
  clampTooltip,
  rafRef,
  explodePx = EXPLODE_PX,
  isActive = false,
  reducedMotion = false,
  tabIndex,
  role,
  ariaLabel,
  ariaPressed,
  interactive = false,
  shouldShowTooltip = true,
  onActivate,
  onDeactivate,
  onToggle,
  onFocus,
  onBlur,
  onKeyDown,
  innerRef,
}: AnimatedArcProps) {
  const [springs, api] = useSpring(() => ({
    startAngle: arc.startAngle,
    endAngle: arc.endAngle,
    x: 0,
    y: 0,
  }));

  React.useEffect(() => {
    api.start({
      startAngle: arc.startAngle,
      endAngle: arc.endAngle,
      immediate: reducedMotion,
    });
  }, [arc.startAngle, arc.endAngle, api, reducedMotion]);

  const [cx, cy] = React.useMemo(() => pie.path.centroid(arc), [pie, arc]);
  const len = Math.max(1, Math.hypot(cx, cy));

  const target = React.useMemo(() => {
    if (isActive && !reducedMotion) {
      return {
        x: (cx / len) * explodePx,
        y: (cy / len) * explodePx,
      };
    }
    return { x: 0, y: 0 };
  }, [isActive, reducedMotion, cx, cy, len, explodePx]);

  React.useEffect(() => {
    api.start({
      x: target.x,
      y: target.y,
      immediate: reducedMotion,
    });
  }, [target, api, reducedMotion]);

  const pathD = springTo(
    [springs.startAngle as SpringValue<number>, springs.endAngle as SpringValue<number>],
    (startAngle, endAngle) => pie.path({ ...arc, startAngle, endAngle })
  );

  const translate = springTo(
    [springs.x as SpringValue<number>, springs.y as SpringValue<number>],
    (x, y) => `translate(${x}, ${y})`
  );

  const pointerTypeFromEvent = (event: React.PointerEvent<SVGGElement>): PointerType => {
    const type = event.pointerType;
    if (type === "mouse" || type === "touch" || type === "pen") return type;
    return "unknown";
  };

  const handlePointerEnter = (event: React.PointerEvent<SVGGElement>) => {
    const pointerType = pointerTypeFromEvent(event);
    onActivate?.(pointerType);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGGElement>) => {
    const pointerType = pointerTypeFromEvent(event);
    onActivate?.(pointerType);

    if (!shouldShowTooltip || pointerType !== "mouse") {
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const pt = localPoint(event) || { x: 0, y: 0 };
      const host = containerRef.current;
      if (host) {
        const rect = host.getBoundingClientRect();
        const screenX = rect.left + pt.x;
        const screenY = rect.top + pt.y;
        const { left, top } = clampTooltip(screenX, screenY);
        showTooltip({
          tooltipData: arc.data,
          tooltipLeft: left,
          tooltipTop: top,
        });
      }
    });
  };

  const handlePointerLeave = (event: React.PointerEvent<SVGGElement>) => {
    const pointerType = pointerTypeFromEvent(event);
    onDeactivate?.(pointerType);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    hideTooltip();
  };

  const handlePointerUp = (event: React.PointerEvent<SVGGElement>) => {
    const pointerType = pointerTypeFromEvent(event);
    onToggle?.(pointerType);
  };

  return (
    <animated.g
      ref={innerRef}
      transform={translate}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      style={{ cursor: interactive ? "pointer" : "default", outline: "none" }}
    >
      <animated.path
        d={pathD}
        fill={color}
        stroke={isActive && reducedMotion ? "rgba(255,255,255,0.85)" : "none"}
        strokeWidth={isActive && reducedMotion ? 2 : 0}
        strokeLinejoin="round"
        strokeMiterlimit={2}
        shapeRendering="geometricPrecision"
        vectorEffect="non-scaling-stroke"
      >
        <title>{String(arc.data.name)}</title>
      </animated.path>
    </animated.g>
  );
}

export interface VisxPieChartProps {
  data: PieDatum[];
  total: number;
  formatTooltip?: (d: PieDatum) => React.ReactNode;
  donutRatio?: number; // 0..1
  colors?: string[];
  baseColor?: string;
  colorMode?: "sequential" | "categorical";
  projectId?: string;
  interactive?: boolean;
  getKey?: (datum: PieDatum, index: number) => string;
  onSliceOpen?: (key: string, datum: PieDatum) => void;
  onActiveDatumChange?: (datum: PieDatum | null, meta: { key: string | null; percent: number | null }) => void;
  analyticsEventName?: string;
  renderCenterLabel?: (args: CenterLabelArgs) => React.ReactNode;
}

// Generic pie/donut chart rendered with visx. Used by budget components and header summaries.
function VisxPieChart({
  data,
  total,
  formatTooltip = (d) => `${d.name}: ${formatUSD(d.value)}`,
  donutRatio = 0.6,
  colors,
  baseColor,
  colorMode = "sequential",
  projectId,
  interactive = false,
  getKey,
  onSliceOpen,
  onActiveDatumChange,
  analyticsEventName = "budget.slice_focus",
  renderCenterLabel = defaultCenterLabelRenderer,
}: VisxPieChartProps) {
  const { activeProject } = useData();
  const projectBase: string = String(
    baseColor || (activeProject as { color?: string } | null)?.color || (projectId ? getColor(projectId) : "#3b82f6")
  );

  const palette = React.useMemo<string[]>(() => {
    if (colors && colors.length) return colors;
    if (colorMode === "categorical") {
      return data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
    }
    // For sequential palettes, ensure the darkest color corresponds to the largest value.
    return generateSequentialPalette(projectBase, data.length).reverse();
  }, [colors, colorMode, projectBase, data.length]);

  const reduceMotion = useReducedMotion();
  const isCoarsePointer = useIsCoarsePointer();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const arcRefs = React.useRef<(SVGGElement | null)[]>([]);
  const orderRef = React.useRef<{ key: string; datum: PieDatum }[]>([]);

  const analyticsRef = React.useRef<typeof window.analytics | null>(null);
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.analytics && typeof window.analytics.track === "function") {
      analyticsRef.current = window.analytics;
    }
  }, []);

  const keyGetter = React.useCallback(
    (datum: PieDatum, index: number) => {
      if (getKey) return getKey(datum, index);
      return String(datum.name ?? index);
    },
    [getKey]
  );

  const entryMap = React.useMemo(() => {
    const entries = data.map((datum, index) => ({ key: keyGetter(datum, index), datum }));
    return new Map(entries.map((entry) => [entry.key, entry]));
  }, [data, keyGetter]);

  const [activeKey, setActiveKey] = React.useState<string | null>(null);

  const percentForDatum = React.useCallback(
    (datum: PieDatum) => {
      if (!total) return 0;
      return (datum.value / total) * 100;
    },
    [total]
  );

  const setActiveEntry = React.useCallback(
    (key: string | null) => {
      if (!interactive) return;
      if (!key) {
        setActiveKey(null);
        onActiveDatumChange?.(null, { key: null, percent: null });
        return;
      }
      const entry = entryMap.get(key);
      if (!entry) {
        setActiveKey(null);
        onActiveDatumChange?.(null, { key: null, percent: null });
        return;
      }
      setActiveKey(key);
      const percent = Number(percentForDatum(entry.datum).toFixed(2));
      onActiveDatumChange?.(entry.datum, { key, percent });
      analyticsRef.current?.track?.(analyticsEventName, {
        key,
        amount: entry.datum.value,
        percent,
      });
    },
    [interactive, entryMap, onActiveDatumChange, percentForDatum, analyticsEventName]
  );

  React.useEffect(() => {
    if (!interactive) return;
    onActiveDatumChange?.(null, { key: null, percent: null });
  }, [interactive, onActiveDatumChange]);

  React.useEffect(() => {
    if (!interactive || !activeKey) return;
    if (!entryMap.has(activeKey)) {
      setActiveEntry(null);
    }
  }, [entryMap, activeKey, interactive, setActiveEntry]);

  const clearActiveEntry = React.useCallback(() => {
    setActiveEntry(null);
  }, [setActiveEntry]);

  const handleActivate = React.useCallback(
    (key: string, pointerType: PointerType) => {
      if (!interactive) return;
      if (pointerType === "mouse" || pointerType === "pen" || pointerType === "unknown") {
        setActiveEntry(key);
      }
    },
    [interactive, setActiveEntry]
  );

  const handleDeactivate = React.useCallback(
    (pointerType: PointerType) => {
      if (!interactive) return;
      if (pointerType === "mouse") {
        clearActiveEntry();
      }
    },
    [interactive, clearActiveEntry]
  );

  const handleToggle = React.useCallback(
    (key: string, pointerType: PointerType) => {
      if (!interactive) {
        onSliceOpen?.(key, entryMap.get(key)?.datum ?? { name: key, value: 0 });
        return;
      }

      const entry = entryMap.get(key);
      if (!entry) return;

      if (pointerType === "mouse") {
        onSliceOpen?.(key, entry.datum);
        return;
      }

      if (activeKey === key) {
        clearActiveEntry();
      } else {
        setActiveEntry(key);
      }
      onSliceOpen?.(key, entry.datum);
    },
    [interactive, entryMap, activeKey, clearActiveEntry, setActiveEntry, onSliceOpen]
  );

  const handleFocus = React.useCallback(
    (key: string) => {
      if (!interactive) return;
      setActiveEntry(key);
    },
    [interactive, setActiveEntry]
  );

  const handleBlur = React.useCallback(() => {
    if (!interactive) return;
    clearActiveEntry();
  }, [interactive, clearActiveEntry]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<SVGGElement>, index: number) => {
      if (!interactive) return;
      const entries = orderRef.current;
      if (!entries.length) return;

      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (index + delta + entries.length) % entries.length;
        const nextEntry = entries[nextIndex];
        if (!nextEntry) return;
        setActiveEntry(nextEntry.key);
        arcRefs.current[nextIndex]?.focus();
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const entry = entries[index];
        if (!entry) return;
        const datum = entryMap.get(entry.key)?.datum ?? entry.datum;
        onSliceOpen?.(entry.key, datum);
      } else if (event.key === "Escape") {
        event.preventDefault();
        clearActiveEntry();
        arcRefs.current[index]?.blur();
      }
    },
    [interactive, setActiveEntry, entryMap, onSliceOpen, clearActiveEntry]
  );

  const centerEntry = interactive && activeKey ? entryMap.get(activeKey) ?? null : null;
  const centerDatum = centerEntry?.datum ?? null;
  const centerPercent = centerDatum ? percentForDatum(centerDatum) : null;

  const shouldShowTooltip = !isCoarsePointer;

  const {
    tooltipOpen,
    tooltipLeft = 0,
    tooltipTop = 0,
    tooltipData,
    showTooltip,
    hideTooltip,
  } = useTooltip<PieDatum>();

  const { TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // Clamp tooltip to viewport
  function clampTooltip(
    x: number,
    y: number,
    tooltipWidth = 160,
    tooltipHeight = 40
  ): ClampResult {
    const offset = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x + offset;
    let top = y + offset;
    if (left + tooltipWidth > vw) left = x - tooltipWidth - offset;
    if (top + tooltipHeight > vh) top = y - tooltipHeight - offset;
    left = Math.max(0, left);
    top = Math.max(0, top);
    return { left, top };
  }

  return (
    <ParentSize>
      {({ width, height }: { width: number; height: number }) => {
        const radius = Math.floor(Math.min(width, height) / 2);
        const baseOuterRadius = Math.max(0, radius - EXPLODE_PX);
        const baseInnerRadius = Math.round(baseOuterRadius * donutRatio);
        const explodeDistance = interactive
          ? Math.max(ACTIVE_OFFSET, baseOuterRadius * ACTIVE_OFFSET_RATIO)
          : EXPLODE_PX;

        return (
          <div
            ref={containerRef}
            style={{
              position: "relative",
              width,
              height,
            }}
          >
            <svg width={width} height={height} style={{ overflow: "visible" }}>
              <Group top={height / 2} left={width / 2}>
                <Pie<PieDatum>
                  data={data}
                  pieValue={(d) => d.value}
                  innerRadius={baseInnerRadius}
                  outerRadius={baseOuterRadius}
                  padAngle={data.length === 1 ? 0 : 0.004}
                  pieSortValues={colorMode === "sequential" ? (a, b) => b - a : undefined}
                >
                  {(pieProps) => {
                    const arcsWithEntries = pieProps.arcs
                      .map((arc, index) => {
                        const key = keyGetter(arc.data, index);
                        const entry = entryMap.get(key);
                        if (!entry) return null;
                        const isActive = interactive && activeKey === key;
                        const adjustedArc: PieArcDatum<PieDatum> = {
                          ...arc,
                          outerRadius: isActive
                            ? baseOuterRadius + ACTIVE_OUTER_RADIUS_DELTA
                            : baseOuterRadius,
                          innerRadius: isActive
                            ? Math.max(0, baseInnerRadius - ACTIVE_INNER_RADIUS_DELTA)
                            : baseInnerRadius,
                        };

                        return {
                          arc: adjustedArc,
                          color: palette[index % palette.length],
                          key,
                          entry,
                        };
                      })
                      .filter((item): item is {
                        arc: PieArcDatum<PieDatum>;
                        color: string;
                        key: string;
                        entry: { key: string; datum: PieDatum };
                      } => Boolean(item));

                    orderRef.current = arcsWithEntries.map(({ entry }) => entry);

                    return arcsWithEntries.map(({ arc, color, key, entry }, orderIndex) => (
                      <AnimatedArc
                        key={`${key}-${orderIndex}`}
                        arc={arc}
                        pie={pieProps}
                        color={color}
                        showTooltip={showTooltip}
                        hideTooltip={hideTooltip}
                        containerRef={containerRef}
                        clampTooltip={clampTooltip}
                        rafRef={rafRef}
                        explodePx={explodeDistance}
                        isActive={interactive && activeKey === key}
                        reducedMotion={reduceMotion}
                        tabIndex={interactive ? 0 : undefined}
                        role={interactive ? "button" : undefined}
                        ariaLabel={
                          interactive
                            ? `${entry.datum.name}, ${formatUSD(entry.datum.value)}, ${formatPercent(
                                percentForDatum(entry.datum)
                              )}%`
                            : undefined
                        }
                        ariaPressed={interactive ? activeKey === key : undefined}
                        interactive={interactive}
                        shouldShowTooltip={shouldShowTooltip}
                        onActivate={(pointerType) => handleActivate(key, pointerType)}
                        onDeactivate={(pointerType) => handleDeactivate(pointerType)}
                        onToggle={(pointerType) => handleToggle(key, pointerType)}
                        onFocus={() => handleFocus(key)}
                        onBlur={handleBlur}
                        onKeyDown={(event) => handleKeyDown(event, orderIndex)}
                        innerRef={(node) => {
                          arcRefs.current[orderIndex] = node;
                        }}
                      />
                    ));
                  }}
                </Pie>
              </Group>
              <text
                x={width / 2}
                y={height / 2}
                dy={4}
                textAnchor="middle"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fill: "#fff",
                  stroke: "rgba(0,0,0,0.7)",
                  strokeWidth: 0.5,
                  paintOrder: "stroke",
                  pointerEvents: "none",
                }}
              >
                {renderCenterLabel({
                  activeDatum: centerDatum,
                  total,
                  percent: centerPercent,
                })}
              </text>
            </svg>

            {shouldShowTooltip && tooltipOpen && tooltipData && (
              <TooltipInPortal
                top={tooltipTop}
                left={tooltipLeft}
                style={{
                  position: "fixed",
                  zIndex: 9999,
                  pointerEvents: "none",
                  background: "rgba(0,0,0,0.9)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  boxShadow: "0 2px 12px 0 rgba(0,0,0,0.18)",
                  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: 1.25,
                  minWidth: 60,
                  maxWidth: 320,
                  wordBreak: "break-word",
                }}
              >
                {formatTooltip(tooltipData)}
              </TooltipInPortal>
            )}
          </div>
        );
      }}
    </ParentSize>
  );
}

// Memoize the component to prevent unnecessary re-renders when props haven't changed
// This ensures animations only trigger on mount or when pieData actually changes
export default memo(VisxPieChart, (prevProps, nextProps) => {
  if (
    prevProps.total !== nextProps.total ||
    prevProps.donutRatio !== nextProps.donutRatio ||
    prevProps.baseColor !== nextProps.baseColor ||
    prevProps.colorMode !== nextProps.colorMode ||
    prevProps.projectId !== nextProps.projectId ||
    prevProps.interactive !== nextProps.interactive ||
    prevProps.onSliceOpen !== nextProps.onSliceOpen ||
    prevProps.getKey !== nextProps.getKey ||
    prevProps.onActiveDatumChange !== nextProps.onActiveDatumChange ||
    prevProps.renderCenterLabel !== nextProps.renderCenterLabel ||
    prevProps.analyticsEventName !== nextProps.analyticsEventName
  ) {
    return false;
  }

  if (prevProps.data.length !== nextProps.data.length) {
    return false;
  }

  for (let i = 0; i < prevProps.data.length; i++) {
    if (
      prevProps.data[i].name !== nextProps.data[i].name ||
      prevProps.data[i].value !== nextProps.data[i].value
    ) {
      return false;
    }
  }

  if (JSON.stringify(prevProps.colors) !== JSON.stringify(nextProps.colors)) {
    return false;
  }

  return true;
});
