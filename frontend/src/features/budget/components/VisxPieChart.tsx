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
}: AnimatedArcProps) {
  const [springs, api] = useSpring(() => ({
    startAngle: 0,
    endAngle: 0,
    x: 0,
    y: 0,
  }));

  React.useEffect(() => {
    api.start({ startAngle: arc.startAngle, endAngle: arc.endAngle });
  }, [arc, api]);

  const pathD = springTo(
    [springs.startAngle as SpringValue<number>, springs.endAngle as SpringValue<number>],
    (startAngle, endAngle) => pie.path({ ...arc, startAngle, endAngle })
  );

  const [cx, cy] = React.useMemo(() => pie.path.centroid(arc), [pie, arc]);
  const len = Math.max(1, Math.hypot(cx, cy));
  const translate = springTo(
    [springs.x as SpringValue<number>, springs.y as SpringValue<number>],
    (x, y) => `translate(${x}, ${y})`
  );
  const isSingle = pie.arcs.length === 1;

  return (
    <animated.g
      transform={translate}
      onMouseEnter={() => {
        if (isSingle) {
          api.start({
            startAngle: arc.startAngle - 0.01,
            endAngle: arc.endAngle + 0.01,
          });
        } else {
          api.start({ x: (cx / len) * explodePx, y: (cy / len) * explodePx });
        }
      }}
      onMouseMove={(e) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const pt = localPoint(e) || { x: 0, y: 0 };
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
      }}
      onMouseLeave={() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        api.start(
          isSingle
            ? { startAngle: arc.startAngle, endAngle: arc.endAngle }
            : { x: 0, y: 0 }
        );
        hideTooltip();
      }}
      style={{ cursor: "pointer" }}
    >
      <animated.path
        d={pathD}
        fill={color}
        stroke="none"
        shapeRendering="geometricPrecision"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeMiterlimit={2}
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
                }}
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
  // Quick reference checks first (most efficient)
  if (
    prevProps.total !== nextProps.total ||
    prevProps.donutRatio !== nextProps.donutRatio ||
    prevProps.baseColor !== nextProps.baseColor ||
    prevProps.colorMode !== nextProps.colorMode ||
    prevProps.projectId !== nextProps.projectId
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
