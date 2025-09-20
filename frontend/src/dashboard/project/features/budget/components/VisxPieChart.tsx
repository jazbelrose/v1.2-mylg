import React, { memo } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { animated, useSpring, to as springTo, SpringValue } from "@react-spring/web";
import { formatUSD } from "@/shared/utils/budgetUtils";
import {
  CHART_COLORS,
  generateSequentialPalette,
  getColor,
} from "@/shared/utils/colorUtils";
import { useData } from "@/app/contexts/useData";

const EXPLODE_PX = 8;

type InteractionMode = "hover" | "touch" | "keyboard";

export type PieDatum = {
  name: string;
  value: number;
  // Allow extra fields if callers pass richer objects
  [key: string]: unknown;
};

type ClampResult = { left: number; top: number };

interface AnimatedArcProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  arc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pie: any;
  color: string;
  showTooltip: (args: { tooltipData: PieDatum; tooltipLeft: number; tooltipTop: number }) => void;
  hideTooltip: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  clampTooltip: (x: number, y: number, tooltipWidth?: number, tooltipHeight?: number) => ClampResult;
  rafRef: React.MutableRefObject<number | null>;
  explodePx?: number;
  index: number;
  isActive: boolean;
  onActivate: (index: number, mode: InteractionMode) => void;
  onDeactivate: (index: number, mode: InteractionMode) => void;
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
  index,
  isActive,
  onActivate,
  onDeactivate,
}: AnimatedArcProps) {
  const [springs, api] = useSpring(() => ({
    startAngle: 0,
    endAngle: 0,
    x: 0,
    y: 0,
  }));

  const isSingle = pie.arcs.length === 1;
  const [cx, cy] = React.useMemo(() => pie.path.centroid(arc), [pie, arc]);
  const len = Math.max(1, Math.hypot(cx, cy));

  React.useEffect(() => {
    api.start({
      startAngle: isSingle && isActive ? arc.startAngle - 0.01 : arc.startAngle,
      endAngle: isSingle && isActive ? arc.endAngle + 0.01 : arc.endAngle,
      x: !isSingle ? (cx / len) * (isActive ? explodePx : 0) : 0,
      y: !isSingle ? (cy / len) * (isActive ? explodePx : 0) : 0,
    });
  }, [arc, api, cx, cy, len, isSingle, isActive, explodePx]);

  const pathD = springTo(
    [springs.startAngle as SpringValue<number>, springs.endAngle as SpringValue<number>],
    (startAngle, endAngle) => pie.path({ ...arc, startAngle, endAngle })
  );

  const translate = springTo(
    [springs.x as SpringValue<number>, springs.y as SpringValue<number>],
    (x, y) => `translate(${x}, ${y})`
  );

  const queueTooltip = React.useCallback(
    (event: React.PointerEvent<SVGGElement>) => {
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
    },
    [arc.data, clampTooltip, containerRef, rafRef, showTooltip]
  );

  const clearTooltip = React.useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    hideTooltip();
  }, [hideTooltip, rafRef]);

  return (
    <animated.g
      transform={translate}
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        onActivate(index, "hover");
        queueTooltip(event);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "touch") return;
        onActivate(index, "hover");
        queueTooltip(event);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") {
          onDeactivate(index, "hover");
        }
        clearTooltip();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.pointerType === "touch") {
          event.preventDefault();
          onActivate(index, "touch");
          clearTooltip();
        }
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        if (event.pointerType === "touch") {
          clearTooltip();
        }
      }}
      onPointerCancel={(event) => {
        if (event.pointerType === "touch") {
          event.stopPropagation();
          clearTooltip();
          return;
        }
        onDeactivate(index, "hover");
        clearTooltip();
      }}
      onFocus={() => {
        onActivate(index, "keyboard");
      }}
      onBlur={() => {
        onDeactivate(index, "keyboard");
        clearTooltip();
      }}
      onClick={(event) => event.stopPropagation()}
      style={{ cursor: "pointer" }}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={String(arc.data.name)}
    >
      <animated.path
        d={pathD}
        fill={color}
        stroke="none"
        shapeRendering="geometricPrecision"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeMiterlimit={2}
      />
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
  onActiveSliceChange?: (active: { datum: PieDatum; index: number } | null) => void;
  activeSliceIndex?: number | null;
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
  onActiveSliceChange,
  activeSliceIndex,
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
  }, [colors, colorMode, projectBase, data]);

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // useTooltip for state/handlers
  const {
    tooltipOpen,
    tooltipLeft = 0,
    tooltipTop = 0,
    tooltipData,
    showTooltip,
    hideTooltip,
  } = useTooltip<PieDatum>();

  // useTooltipInPortal for portal rendering
  const { TooltipInPortal } = useTooltipInPortal({
    scroll: true,
  });

  // Throttle mouse move with requestAnimationFrame
  const rafRef = React.useRef<number | null>(null);

  const [internalActiveIndex, setInternalActiveIndex] = React.useState<number | null>(null);
  const derivedActiveIndex = activeSliceIndex ?? internalActiveIndex;
  const lastInteractionRef = React.useRef<InteractionMode | null>(null);
  const lastNotifiedIndexRef = React.useRef<number | null>(null);

  // State for center hover popover
  const [isCenterHovered, setIsCenterHovered] = React.useState(false);

  const notifyActiveChange = React.useCallback(
    (index: number | null) => {
      if (index === lastNotifiedIndexRef.current) {
        return;
      }
      lastNotifiedIndexRef.current = index;
      if (!onActiveSliceChange) return;
      if (index == null || index < 0 || index >= data.length) {
        onActiveSliceChange(null);
        return;
      }
      onActiveSliceChange({ datum: data[index], index });
    },
    [onActiveSliceChange, data]
  );

  React.useEffect(() => {
    return () => {
      const handle = rafRef.current;
      if (handle) {
        cancelAnimationFrame(handle);
        rafRef.current = null;
      }
    };
  }, [rafRef]);

  const activateSlice = React.useCallback(
    (index: number, mode: InteractionMode) => {
      lastInteractionRef.current = mode;
      if (activeSliceIndex === undefined) {
        setInternalActiveIndex((prev) => (prev === index ? prev : index));
      }
      notifyActiveChange(index);
    },
    [activeSliceIndex, notifyActiveChange]
  );

  const deactivateSlice = React.useCallback(
    (index: number, mode: InteractionMode) => {
      const currentIndex = activeSliceIndex ?? internalActiveIndex;
      if (currentIndex !== index) {
        return;
      }
      if (mode === "hover" && lastInteractionRef.current === "touch") {
        return;
      }
      if (activeSliceIndex === undefined) {
        setInternalActiveIndex((prev) => (prev === null ? prev : null));
      }
      lastInteractionRef.current = null;
      notifyActiveChange(null);
    },
    [activeSliceIndex, internalActiveIndex, notifyActiveChange]
  );

  React.useEffect(() => {
    if (derivedActiveIndex != null && (derivedActiveIndex < 0 || derivedActiveIndex >= data.length)) {
      if (activeSliceIndex === undefined) {
        setInternalActiveIndex(null);
      }
      notifyActiveChange(null);
    }
  }, [derivedActiveIndex, data.length, activeSliceIndex, notifyActiveChange]);

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
        const isSingle = data.length === 1;
        const radius = Math.floor(Math.min(width, height) / 2);
        const outerRadius = Math.max(0, radius - EXPLODE_PX);
        const innerRadius = Math.round(outerRadius * donutRatio);

        return (
          <div
            ref={containerRef}
            style={{
              position: "relative",
              width,
              height,
            }}
          >
            <svg width={width} height={height}>
              <Group top={height / 2} left={width / 2}>
                <Pie<PieDatum>
                  data={data}
                  pieValue={(d) => d.value}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  padAngle={isSingle ? 0 : 0.004}
                  pieSortValues={colorMode === "sequential" ? (a, b) => b - a : undefined}
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(pieProps: any) =>
                    pieProps.arcs.map((arc, i) => (
                      <AnimatedArc
                        key={`${String(arc.data.name)}-${i}`}
                        arc={arc}
                        pie={pieProps}
                        color={palette[i % palette.length]}
                        showTooltip={showTooltip}
                        hideTooltip={hideTooltip}
                        containerRef={containerRef}
                        clampTooltip={clampTooltip}
                        rafRef={rafRef}
                        explodePx={EXPLODE_PX}
                        index={i}
                        isActive={derivedActiveIndex === i}
                        onActivate={activateSlice}
                        onDeactivate={deactivateSlice}
                      />
                    ))
                  }
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
                  cursor: "pointer",
                }}
                onMouseEnter={() => setIsCenterHovered(true)}
                onMouseLeave={() => setIsCenterHovered(false)}
              >
                {formatUSD(total)}
              </text>
            </svg>

            {tooltipOpen && tooltipData && (
              <TooltipInPortal
                top={tooltipTop}
                left={tooltipLeft}
                style={{
                  position: "fixed",
                  zIndex: 9999,
                  pointerEvents: "none",
                  backgroundColor: "rgba(30, 30, 30, 0.9)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
                  backdropFilter: "blur(4px)",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  lineHeight: 1.1,
                  minWidth: 60,
                  maxWidth: 160,
                  wordBreak: "break-word",
                }}
              >
                {formatTooltip(tooltipData)}
              </TooltipInPortal>
            )}

            {isCenterHovered && data.length > 0 && (
              <TooltipInPortal
                top={(containerRef.current?.getBoundingClientRect().top || 0) + height / 2 + 20}
                left={(containerRef.current?.getBoundingClientRect().left || 0) + width / 2}
                style={{
                  position: "fixed",
                  zIndex: 9999,
                  pointerEvents: "none",
                  backgroundColor: "rgba(30, 30, 30, 0.95)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                  backdropFilter: "blur(4px)",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  lineHeight: 1.4,
                  maxWidth: 280,
                  wordBreak: "break-word",
                  transform: "translateX(-50%)",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "8px", textAlign: "center" }}>
                  Budget Breakdown
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {data.map((item, index) => {
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
                    return (
                      <div
                        key={item.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "0.75rem",
                        }}
                      >
                        <div
                          style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "2px",
                            backgroundColor: palette[index % palette.length],
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>{item.name}</span>
                        <span style={{ fontWeight: 600, color: "#ccc" }}>
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
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
  // Quick reference checks first (most efficient)
  if (
    prevProps.total !== nextProps.total ||
    prevProps.donutRatio !== nextProps.donutRatio ||
    prevProps.baseColor !== nextProps.baseColor ||
    prevProps.colorMode !== nextProps.colorMode ||
    prevProps.projectId !== nextProps.projectId ||
    prevProps.onActiveSliceChange !== nextProps.onActiveSliceChange ||
    prevProps.activeSliceIndex !== nextProps.activeSliceIndex
  ) {
    return false;
  }
  
  // Check data array length first
  if (prevProps.data.length !== nextProps.data.length) {
    return false;
  }
  
  // Deep comparison for data array (only if lengths match)
  // This is the key check for ensuring re-renders only happen when pie data actually changes
  for (let i = 0; i < prevProps.data.length; i++) {
    if (
      prevProps.data[i].name !== nextProps.data[i].name || 
      prevProps.data[i].value !== nextProps.data[i].value
    ) {
      return false;
    }
  }
  
  // Compare colors array (using JSON.stringify as colors are typically small arrays)
  if (JSON.stringify(prevProps.colors) !== JSON.stringify(nextProps.colors)) {
    return false;
  }
  
  // All props are equal - skip re-render (this prevents unnecessary animations)
  return true;
});









