import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Sector,
  type TooltipProps,
} from "recharts";

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

type TooltipValueType = number | string | Array<number | string>;

type TooltipNameType = number | string;

export interface BudgetDonutProps {
  data: BudgetDonutSlice[];
  total: number;
  totalLabel?: string;
  totalFormatter?: (value: number) => string;
  formatTooltip?: (slice: BudgetDonutDatum) => string;
  palette?: string[];
  ariaLabel?: string;
  explodeOnHover?: boolean;
  explodeOnClick?: boolean;
  className?: string;
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

const centerButtonBaseBackground = "rgba(15, 23, 42, 0.6)";
const centerButtonBaseShadow = "0 8px 20px rgba(15, 23, 42, 0.45)";

const centerButtonStyles: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  border: "none",
  background: centerButtonBaseBackground,
  borderRadius: "999px",
  padding: "10px 18px",
  color: "inherit",
  cursor: "pointer",
  pointerEvents: "auto",
  transition: "background 150ms ease, box-shadow 150ms ease",
  boxShadow: centerButtonBaseShadow,
};

const centerLabelStyles: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "#cbd5f5",
  letterSpacing: "0.02em",
};

const centerValueStyles: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
};

const centerPopoverStyles: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  background: "rgba(30, 30, 30, 0.94)",
  color: "#f8fafc",
  borderRadius: "12px",
  padding: "14px 16px",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.55)",
  minWidth: "220px",
  maxWidth: "260px",
  zIndex: 2,
  pointerEvents: "auto",
};

const centerPopoverHeaderStyles: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: "10px",
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  opacity: 0.9,
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
};

const tooltipStyles: React.CSSProperties = {
  background: "#0f172a",
  color: "#f8fafc",
  borderRadius: "6px",
  border: "1px solid rgba(148, 163, 184, 0.4)",
  padding: "6px 10px",
  fontSize: "0.75rem",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.45)",
};

const renderActiveShape = (props: Record<string, unknown>) => {
  const outerRadius = typeof props.outerRadius === "number" ? props.outerRadius : 0;
  return <Sector {...(props as never)} outerRadius={outerRadius + 8} />;
};

const slicesAreEqual = (a: BudgetDonutSlice[], b: BudgetDonutSlice[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id || a[i].value !== b[i].value) {
      return false;
    }
  }
  return true;
};

const BudgetDonut: React.FC<BudgetDonutProps> = ({
  data,
  total,
  totalLabel = "Total",
  totalFormatter = (value) => value.toLocaleString(),
  formatTooltip,
  palette,
  ariaLabel = "Budget allocation donut chart",
  explodeOnHover = true,
  explodeOnClick = true,
  className,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [isCenterOpen, setIsCenterOpen] = useState(false);

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

  const tooltipRenderer = useCallback(
    ({ active, payload }: TooltipProps<TooltipValueType, TooltipNameType>) => {
      if (!active || !payload || payload.length === 0) return null;
      const datum = payload[0]?.payload as BudgetDonutDatum | undefined;
      if (!datum) return null;
      const text = formatTooltip
        ? formatTooltip(datum)
        : `${datum.label}: ${Math.round(datum.value).toLocaleString()}`;
      return (
        <div style={tooltipStyles} role="presentation">
          {text}
        </div>
      );
    },
    [formatTooltip]
  );

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

  const openCenterPopover = useCallback(() => {
    setIsCenterOpen(true);
  }, []);

  const closeCenterPopover = useCallback(() => {
    setIsCenterOpen(false);
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
    closeCenterPopover();
  }, [dataSignature, total, closeCenterPopover]);

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={{ width: "100%", height: "100%", position: "relative" }}
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
            content={tooltipRenderer}
            cursor={{ fill: "rgba(255,255,255,0.08)" }}
            wrapperStyle={{ zIndex: 10 }}
          />
        </PieChart>
      </ResponsiveContainer>

      <button
        ref={centerButtonRef}
        type="button"
        style={{
          ...centerButtonStyles,
          background: isCenterOpen ? "rgba(15, 23, 42, 0.75)" : centerButtonBaseBackground,
          boxShadow: isCenterOpen
            ? "0 12px 32px rgba(15, 23, 42, 0.6)"
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
        {totalLabel ? <span style={centerLabelStyles}>{totalLabel}</span> : null}
        <span style={centerValueStyles}>{formattedTotal}</span>
      </button>

      {isCenterOpen ? (
        <div
          ref={centerPopoverRef}
          style={centerPopoverStyles}
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
        </div>
      ) : null}

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
  if (prev.totalLabel !== next.totalLabel) return false;
  if (prev.totalFormatter !== next.totalFormatter) return false;
  if (prev.formatTooltip !== next.formatTooltip) return false;
  if (prev.ariaLabel !== next.ariaLabel) return false;
  if (prev.explodeOnHover !== next.explodeOnHover) return false;
  if (prev.explodeOnClick !== next.explodeOnClick) return false;
  if (prev.palette !== next.palette) return false;
  if (!slicesAreEqual(prev.data, next.data)) return false;
  return true;
});

