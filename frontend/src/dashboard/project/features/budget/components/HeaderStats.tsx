import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faMoneyBillWave,
  faPercent,
  faFileInvoiceDollar,
  faCalculator,
} from "@fortawesome/free-solid-svg-icons";
import { Segmented } from "antd";

import EditBallparkModal from "@/dashboard/project/features/budget/components/EditBallparkModal";
import ClientInvoicePreviewModal from "@/dashboard/project/features/budget/ClientInvoicePreviewModal";
import BudgetDonut, {
  type BudgetDonutSlice,
  type BudgetDonutDatum,
} from "@/dashboard/project/features/budget/components/BudgetDonut";
import { useSocket } from "@/app/contexts/useSocket";

import { updateBudgetItem } from "@/shared/utils/api";
import { formatUSD, parseBudget } from "@/shared/utils/budgetUtils";
import {
  CHART_COLORS,
  generateSequentialPalette,
  getColor,
} from "@/shared/utils/colorUtils";

import summaryStyles from "./budget-header-summary.module.css";
import headerStyles from "./header-stats.module.css";
import mobileStyles from "./budget-header-mobile.module.css";
import toolbarStyles from "./BudgetToolbar.module.css";

/* =========================
   Types
   ========================= */

type MetricTitle =
  | "Ballpark"
  | "Budgeted Cost"
  | "Actual Cost"
  | "Reconciled Cost"
  | "Effective Markup"
  | "Final Cost";

type GroupBy = "none" | "areaGroup" | "invoiceGroup" | "category";

type MarkupBasis = "Budgeted" | "Actual" | "Reconciled";

type MetricConfig = {
  title: MetricTitle;
  tag: string;
  icon: IconDefinition;
  color: string;
  value: string;
  chartValue: number;
  description: string;
  field: keyof BudgetItem | "markupAmount" | null;
  sticky?: boolean;
  extra?: React.ReactNode;
  isPercentage?: boolean;
  onClick?: () => void;
};

export interface BudgetItem {
  [key: string]: unknown;
  areaGroup?: string;
  invoiceGroup?: string;
  category?: string;
  quantity?: string | number;

  // numeric fields (string or number in data; we coerce with parseBudget)
  itemBudgetedCost?: string | number;
  itemActualCost?: string | number;
  itemReconciledCost?: string | number;
  itemFinalCost?: string | number;
  itemMarkUp?: string | number;
}

export interface BudgetHeaderData {
  budgetItemId: string;
  revision: number;
  headerBallPark?: number | string;
  headerBudgetedTotalCost?: number | string;
  headerActualTotalCost?: number | string;
  headerFinalTotalCost?: number | string;
  clientRevisionId?: number | string | null;
  createdAt?: string | number | Date | null;
}

export interface ProjectLike {
  projectId?: string;
  color?: string;
}

type SegmentedValue = GroupBy | MarkupBasis;

interface SummaryCardProps {
  icon: IconDefinition;
  color: string;
  title: MetricTitle;
  tag: string;
  value: string;
  description: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface BudgetHeaderProps {
  activeProject?: ProjectLike | null;
  budgetHeader?: BudgetHeaderData | null;
  groupBy: GroupBy;
  setGroupBy: (g: GroupBy) => void;
  budgetItems?: BudgetItem[];
  onBallparkChange?: (val: number) => void;
  onOpenRevisionModal: () => void;
}

const RELEVANT_WS_ACTIONS = new Set<unknown>([
  "budgetUpdated",
  "projectTotalsUpdated",
  "chartDataUpdated",
]);

const computeSignature = (slices: BudgetDonutSlice[]): string =>
  slices.map((slice) => `${slice.id}:${slice.value}`).join("|");

const palettesAreEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

type ChartState = {
  slices: BudgetDonutSlice[];
  total: number;
  palette: string[];
  signature: string;
};

const MOBILE_BREAKPOINT = 768;
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

/* =========================
   Helpers
   ========================= */

const toNumber = (v: number | string | undefined | null): number =>
  parseBudget(v);

const toQuantity = (value: unknown): number => {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

/* =========================
   Components
   ========================= */

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  color,
  title,
  tag,
  value,
  description,
  onClick,
  active,
  className = "",
  children,
}) => (
  <div
    className={`${summaryStyles.card} ${active ? summaryStyles.active : ""} ${className}`}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    aria-label={onClick ? title : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
  >
    <div className={summaryStyles.cardIcon} style={{ background: color }}>
      <FontAwesomeIcon icon={icon} />
    </div>
    <span className={summaryStyles.cardTag}>{tag}</span>
    {children}
    <div className={summaryStyles.cardTitle}>{title}</div>
    <div className={summaryStyles.cardValue}>{value}</div>
    <div className={summaryStyles.cardDesc}>{description}</div>
  </div>
);

/* =========================
   Main
   ========================= */

const BudgetHeader: React.FC<BudgetHeaderProps> = ({
  activeProject,
  budgetHeader,
  groupBy,
  setGroupBy,
  budgetItems = [],
  onBallparkChange,
  onOpenRevisionModal,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricTitle>("Final Cost");
  const [isMobile, setIsMobile] = useState(false);

  const hasReconciled = useMemo(
    () =>
      budgetItems.some(
        (it) => it.itemReconciledCost != null && String(it.itemReconciledCost) !== ""
      ),
    [budgetItems]
  );

  const [showReconciled, setShowReconciled] = useState<boolean>(false);
  const [markupBasis, setMarkupBasis] = useState<MarkupBasis>("Budgeted");
  const [isBallparkModalOpen, setBallparkModalOpen] = useState(false);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoiceRevision, setInvoiceRevision] = useState<BudgetHeaderData | null>(null);

  const { ws } = useSocket();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handleChange = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    handleChange(mediaQuery);

    const listener = (event: MediaQueryListEvent) => handleChange(event);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
  }, []);

  useEffect(() => {
    if (!hasReconciled) setShowReconciled(false);
  }, [hasReconciled]);

  useEffect(() => {
    if (!hasReconciled && markupBasis === "Reconciled") {
      setMarkupBasis("Budgeted");
    }
  }, [hasReconciled, markupBasis]);

  useEffect(() => {
    if (!showReconciled && markupBasis === "Reconciled") {
      setMarkupBasis("Actual");
    }
  }, [showReconciled, markupBasis]);

  const openInvoicePreview = useCallback(() => {
    if (!budgetHeader) return;
    setInvoiceRevision(budgetHeader);
    setIsInvoicePreviewOpen(true);
  }, [budgetHeader]);

  const closeInvoicePreview = useCallback(() => {
    setIsInvoicePreviewOpen(false);
    // blur the trigger to avoid leftover focus outline
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && typeof active.blur === "function") {
        active.blur();
      }
    }, 0);
  }, []);

  const reconciledTotal = useMemo(
    () =>
      budgetItems.reduce(
        (sum, it) => sum + toQuantity(it.quantity) * toNumber(it.itemReconciledCost),
        0
      ),
    [budgetItems]
  );

  useEffect(() => {
    if (selectedMetric === "Actual Cost" || selectedMetric === "Reconciled Cost") {
      setSelectedMetric(showReconciled ? "Reconciled Cost" : "Actual Cost");
    }
  }, [showReconciled, selectedMetric]);

  const handleBallparkCardClick = useCallback(() => {
    setBallparkModalOpen(true);
  }, []);

  const handleActualMetricCardClick = useCallback(() => {
    const currentTitle = (showReconciled ? "Reconciled Cost" : "Actual Cost") as MetricTitle;
    const currentBasis: MarkupBasis = showReconciled ? "Reconciled" : "Actual";
    const isCurrentSelection = selectedMetric === currentTitle;

    if (!isCurrentSelection) {
      setSelectedMetric(currentTitle);
      setMarkupBasis(currentBasis);
      return;
    }

    if (!hasReconciled) {
      return;
    }

    setShowReconciled((prev) => {
      const nextShowReconciled = !prev;
      const nextTitle = (nextShowReconciled ? "Reconciled Cost" : "Actual Cost") as MetricTitle;
      const nextBasis: MarkupBasis = nextShowReconciled ? "Reconciled" : "Actual";
      setSelectedMetric(nextTitle);
      setMarkupBasis(nextBasis);
      return nextShowReconciled;
    });
  }, [hasReconciled, selectedMetric, showReconciled]);

  const metrics = useMemo<MetricConfig[]>(
    () => [
      {
        title: "Ballpark" as MetricTitle,
        tag: "Estimate",
        icon: faCalculator,
        color: CHART_COLORS[4],
        value: formatUSD(toNumber(budgetHeader?.headerBallPark)),
        chartValue: toNumber(budgetHeader?.headerBallPark),
        description: "Estimated total",
        field: null,
        onClick: handleBallparkCardClick,
      },
      {
        title: "Budgeted Cost" as MetricTitle,
        tag: "Budgeted",
        icon: faCoins,
        color: CHART_COLORS[0],
        value: formatUSD(toNumber(budgetHeader?.headerBudgetedTotalCost)),
        chartValue: toNumber(budgetHeader?.headerBudgetedTotalCost),
        description: "Planned expenses",
        field: "itemBudgetedCost",
        sticky: true,
      },
      {
        title: (showReconciled ? "Reconciled Cost" : "Actual Cost") as MetricTitle,
        tag: showReconciled ? "Reconciled" : "Actual",
        icon: faMoneyBillWave,
        color: CHART_COLORS[1],
        value: formatUSD(
          showReconciled ? reconciledTotal : toNumber(budgetHeader?.headerActualTotalCost)
        ),
        chartValue: showReconciled
          ? reconciledTotal
          : toNumber(budgetHeader?.headerActualTotalCost),
        description: showReconciled ? "Reconciled spending" : "Recorded spending",
        field: showReconciled ? "itemReconciledCost" : "itemActualCost",
        sticky: true,
        onClick: handleActualMetricCardClick,
      },
      {
        title: "Effective Markup" as MetricTitle,
        tag: "Markup",
        icon: faPercent,
        color: CHART_COLORS[2],
        value: (() => {
          const finalTotal = toNumber(budgetHeader?.headerFinalTotalCost);
          const budgetedTotal = toNumber(budgetHeader?.headerBudgetedTotalCost);
          const actualTotal = toNumber(budgetHeader?.headerActualTotalCost);
          const base =
            markupBasis === "Budgeted"
              ? budgetedTotal
              : markupBasis === "Reconciled"
              ? reconciledTotal
              : actualTotal;
          if (!base) return "N/A";
          const diff = finalTotal - base;
          const percent = Math.round((diff / base) * 100);
          return `${percent}% (${formatUSD(diff)})`;
        })(),
        chartValue: (() => {
          const finalTotal = toNumber(budgetHeader?.headerFinalTotalCost);
          const budgetedTotal = toNumber(budgetHeader?.headerBudgetedTotalCost);
          const actualTotal = toNumber(budgetHeader?.headerActualTotalCost);
          const base =
            markupBasis === "Budgeted"
              ? budgetedTotal
              : markupBasis === "Reconciled"
              ? reconciledTotal
              : actualTotal;
          return finalTotal - base;
        })(),
        description: `${markupBasis} Markup`,
        field: "markupAmount",
        isPercentage: true,
        extra: (
          <Segmented
            size="small"
            options={
              showReconciled
                ? (["Budgeted", "Actual", "Reconciled"] as MarkupBasis[])
                : (["Budgeted", "Actual"] as MarkupBasis[])
            }
            value={markupBasis}
            onChange={(val: SegmentedValue) => setMarkupBasis(val as MarkupBasis)}
            className={summaryStyles.toggleSwitch}
          />
        ),
      },
      {
        title: "Final Cost" as MetricTitle,
        tag: "Final",
        icon: faFileInvoiceDollar,
        color: CHART_COLORS[3],
        value: formatUSD(toNumber(budgetHeader?.headerFinalTotalCost)),
        chartValue: toNumber(budgetHeader?.headerFinalTotalCost),
        description: "All-in total",
        field: "itemFinalCost",
        sticky: true,
        extra: (
          <div className={summaryStyles.invoicePreviewContainer}>
            <FontAwesomeIcon
              icon={faFileInvoiceDollar}
              className={summaryStyles.invoicePreviewIcon}
              title="Invoice preview"
              aria-label="Invoice preview"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                openInvoicePreview();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  openInvoicePreview();
                }
              }}
            />
            <span
              className={headerStyles.revisionLabel}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onOpenRevisionModal();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenRevisionModal();
                }
              }}
            >
              {`Rev.${budgetHeader?.revision ?? 1}`}
            </span>
          </div>
        ),
      },
    ],
    [
      budgetHeader,
      showReconciled,
      reconciledTotal,
      markupBasis,
      openInvoicePreview,
      onOpenRevisionModal,
      handleBallparkCardClick,
      handleActualMetricCardClick,
    ]
  );

  const groupOptions = useMemo(
    () => [
      { label: "None", value: "none" as GroupBy },
      { label: "Area Group", value: "areaGroup" as GroupBy },
      { label: "Invoice Group", value: "invoiceGroup" as GroupBy },
      { label: "Category", value: "category" as GroupBy },
    ],
    []
  );

  const createdDateLabel = useMemo(() => {
    if (!budgetHeader?.createdAt) return "No date";
    const date = new Date(budgetHeader.createdAt);
    if (Number.isNaN(date.getTime())) return "No date";
    return date.toLocaleDateString();
  }, [budgetHeader?.createdAt]);

  const finalDisplay = useMemo(
    () =>
      budgetHeader
        ? formatUSD(toNumber(budgetHeader.headerFinalTotalCost))
        : "Not available",
    [budgetHeader]
  );

  const finalMetric = useMemo(
    () => metrics.find((metric) => metric.title === "Final Cost"),
    [metrics]
  );

  const finalMetricTag = finalMetric?.tag ?? "Final";
  const finalMetricDescription = finalMetric?.description ?? "All-in total";
  const finalMetricIcon = finalMetric?.icon ?? faFileInvoiceDollar;

  const handleBallparkSave = async (val: number) => {
    if (!activeProject?.projectId || !budgetHeader) {
      setBallparkModalOpen(false);
      return;
    }
    try {
      const headerId = String(budgetHeader?.budgetItemId || "");
      const revision = Number(budgetHeader?.revision ?? 1);
      await updateBudgetItem(activeProject.projectId, headerId, {
        headerBallPark: val,
        revision,
      });
      onBallparkChange?.(val);
    } catch (err) {
      // keep quiet but log
       
      console.error("Error updating ballpark", err);
    }
    setBallparkModalOpen(false);
  };

  const resolvedProjectKey = useMemo(
    () => (activeProject?.projectId ? String(activeProject.projectId) : null),
    [activeProject?.projectId]
  );

  const accentHex = useMemo(() => {
    const providedColor =
      typeof activeProject?.color === "string" && activeProject.color.trim() !== ""
        ? normalizeHexColor(activeProject.color)
        : null;

    if (providedColor) {
      return providedColor;
    }

    const generated = normalizeHexColor(getColor(resolvedProjectKey ?? "budget"));
    return generated ?? FALLBACK_ACCENT_COLOR;
  }, [activeProject?.color, resolvedProjectKey]);

  const accentAlpha = useCallback(
    (alpha: number) => rgbaFromHex(accentHex, alpha),
    [accentHex]
  );

  const computeChartState = useCallback((): ChartState => {
    const baseColorSource = accentHex;

    if (groupBy === "none") {
      const slices = metrics.map((metric) => ({
        id: `metric-${metric.title}`,
        label: metric.title,
        value: toNumber(metric.chartValue as number | string | undefined | null),
      }));

      const palette = slices.length
        ? generateSequentialPalette(baseColorSource, slices.length).reverse()
        : [];

      return {
        slices,
        total: toNumber(budgetHeader?.headerFinalTotalCost),
        palette,
        signature: computeSignature(slices),
      };
    }

    const selected = metrics.find((m) => m.title === selectedMetric);
    const field = (selected?.field as keyof BudgetItem) || "itemFinalCost";

    const totals: Record<string, number> = {};
    budgetItems.forEach((item) => {
      const rawKey = (item[groupBy] as string) || "Unspecified";
      const key = rawKey && rawKey.trim() !== "" ? rawKey : "Unspecified";
      let val: number;
      const quantity = toQuantity(item.quantity);

      if (field === "markupAmount") {
        const finalCost = toNumber(item.itemFinalCost);
        const budgeted = toNumber(item.itemBudgetedCost);
        const actual = toNumber(item.itemActualCost);
        const reconciled = toNumber(item.itemReconciledCost) * quantity;
        const base =
          markupBasis === "Budgeted"
            ? budgeted
            : markupBasis === "Reconciled"
            ? reconciled
            : actual;
        val = finalCost - base;
      } else if (field === "itemMarkUp") {
        val = toNumber(item[field] as number | string | undefined | null) * 100;
      } else {
        const numericValue = toNumber(item[field] as number | string | undefined | null);
        val = field === "itemReconciledCost" ? numericValue * quantity : numericValue;
      }

      const safeValue = Number.isNaN(val) ? 0 : val;
      totals[key] = (totals[key] ?? 0) + safeValue;
    });

    const slices = Object.entries(totals).map(([label, value]) => ({
      id: `${groupBy}-${label}`,
      label,
      value,
    }));

    const sortedSlices = [...slices].sort((a, b) => b.value - a.value);
    const palette = sortedSlices.length
      ? generateSequentialPalette(baseColorSource, sortedSlices.length).reverse()
      : [];

    return {
      slices: sortedSlices,
      total: sortedSlices.reduce((sum, slice) => sum + slice.value, 0),
      palette,
      signature: computeSignature(sortedSlices),
    };
  }, [
    accentHex,
    budgetHeader?.headerFinalTotalCost,
    budgetItems,
    groupBy,
    markupBasis,
    metrics,
    selectedMetric,
  ]);

  const [chartState, setChartState] = useState<ChartState>(() => computeChartState());

  const updateRafRef = useRef<number | null>(null);

  const scheduleUpdate = useCallback(() => {
    if (updateRafRef.current) {
      cancelAnimationFrame(updateRafRef.current);
    }
    updateRafRef.current = requestAnimationFrame(() => {
      updateRafRef.current = null;
      const shaped = computeChartState();
      setChartState((prev) => {
        if (prev.signature === shaped.signature) {
          const paletteChanged = !palettesAreEqual(prev.palette, shaped.palette);
          const totalChanged = prev.total !== shaped.total;
          if (!paletteChanged && !totalChanged) {
            return prev;
          }
          return {
            ...prev,
            total: totalChanged ? shaped.total : prev.total,
            palette: paletteChanged ? shaped.palette : prev.palette,
          };
        }
        return shaped;
      });
    });
  }, [computeChartState]);

  useEffect(() => scheduleUpdate(), [scheduleUpdate]);

  useEffect(
    () => () => {
      if (updateRafRef.current) {
        cancelAnimationFrame(updateRafRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data as string);
      } catch (error) {
        console.error("Failed to parse WebSocket message", error);
        return;
      }

      if (!parsed || typeof parsed !== "object") return;
      const action = (parsed as { action?: unknown }).action;
      if (typeof action !== "string" || !RELEVANT_WS_ACTIONS.has(action)) return;

      const targetProject = (parsed as { projectId?: unknown }).projectId;
      if (
        resolvedProjectKey &&
        targetProject &&
        String(targetProject) !== resolvedProjectKey
      ) {
        return;
      }

      scheduleUpdate();
    };

    ws.addEventListener("message", handleMessage);
    return () => {
      ws.removeEventListener("message", handleMessage);
    };
  }, [ws, scheduleUpdate, resolvedProjectKey]);

  const formatTooltip = useCallback(
    (slice: BudgetDonutDatum) => {
      const metric =
        groupBy === "none"
          ? metrics.find((m) => m.title === slice.label)
          : metrics.find((m) => m.title === selectedMetric);
      const isPercent =
        (metric as { isPercentage?: boolean })?.isPercentage &&
        (groupBy === "none" ? slice.label !== "Effective Markup" : selectedMetric !== "Effective Markup");
      const rounded = Math.round(slice.value);
      const value = isPercent ? `${rounded}%` : formatUSD(rounded);
      return `${slice.label}: ${value}`;
    },
    [groupBy, metrics, selectedMetric]
  );

  const totalFormatter = useCallback(
    (value: number) => formatUSD(Math.round(value)),
    []
  );

  const desktopContent = (
    <div className={summaryStyles.container}>
      <div className={summaryStyles.cardsColumn}>
        <div className={summaryStyles.cardsRow}>
          {metrics.slice(0, 3).map((m) => (
            <SummaryCard
              key={m.title}
              icon={m.icon}
              color={m.color}
              title={m.title}
              tag={m.tag}
              value={m.value}
              description={m.description}
              className={m.sticky ? summaryStyles.stickyCard : ""}
              onClick={
                m.onClick ?? (m.field ? () => setSelectedMetric(m.title) : undefined)
              }
              active={selectedMetric === m.title}
            >
              {m.extra}
            </SummaryCard>
          ))}
        </div>

        <div className={summaryStyles.cardsRow}>
          {metrics.slice(3).map((m) => (
            <SummaryCard
              key={m.title}
              icon={m.icon}
              color={m.color}
              title={m.title}
              tag={m.tag}
              value={m.value}
              description={m.description}
              className={m.sticky ? summaryStyles.stickyCard : ""}
              onClick={
                m.onClick ?? (m.field ? () => setSelectedMetric(m.title) : undefined)
              }
              active={selectedMetric === m.title}
            >
              {m.extra}
            </SummaryCard>
          ))}
        </div>
      </div>

      <div className={summaryStyles.chartColumn}>
        <div className={summaryStyles.chartAndLegend}>
          <div className={summaryStyles.chartContainer}>
            <BudgetDonut
              data={chartState.slices}
              total={chartState.total}
              palette={chartState.palette}
              formatTooltip={formatTooltip}
              totalFormatter={totalFormatter}
            />
          </div>
          <ul className={summaryStyles.legend}>
            {chartState.slices.map((slice, index) => {
              const palette = chartState.palette;
              const paletteLength = palette.length;
              const background =
                paletteLength > 0
                  ? palette[index % paletteLength]
                  : getColor(`${slice.id}-${index}`);
              return (
                <li className={summaryStyles.legendItem} key={slice.id}>
                  <span
                    className={summaryStyles.legendDot}
                    style={{ background }}
                  />
                  {slice.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );

  const topMetrics = metrics.slice(0, 3);
  const bottomMetrics = metrics.slice(3);

  const mobileAccentStyle = useMemo(
    () =>
      ({
        "--budget-accent": accentHex,
        "--budget-accent-soft": accentAlpha(0.16),
        "--budget-accent-softer": accentAlpha(0.24),
        "--budget-accent-border": accentAlpha(0.32),
        "--budget-accent-glow": accentAlpha(0.22),
        "--budget-accent-chip": accentAlpha(0.18),
        "--budget-accent-chip-active": accentAlpha(0.3),
        "--budget-accent-text": "rgba(255, 255, 255, 0.92)",
      }) as React.CSSProperties,
    [accentAlpha, accentHex]
  );

  const renderMetricChip = (metric: (typeof metrics)[number]) => {
    const isReconciledToggleMetric =
      hasReconciled &&
      metric.field === (showReconciled ? "itemReconciledCost" : "itemActualCost");
    const isBudgetedMetric = metric.title === "Budgeted Cost";
    const isBallparkMetric = metric.title === "Ballpark";

    const activateBudgetedMetric = () => {
      setMarkupBasis("Budgeted");
      setSelectedMetric("Budgeted Cost");
    };

    const activateActualMetric = () => {
      const nextTitle = (showReconciled ? "Reconciled Cost" : "Actual Cost") as MetricTitle;
      const nextBasis = showReconciled ? "Reconciled" : "Actual";
      setSelectedMetric(nextTitle);
      setMarkupBasis(nextBasis);
    };

    const chipClassName = [
      mobileStyles.metricChip,
      selectedMetric === metric.title ? mobileStyles.metricChipActive : "",
    ]
      .filter(Boolean)
      .join(" ");

    const tagClassName = [
      mobileStyles.metricTag,
      isBallparkMetric ? mobileStyles.metricTagBallpark : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div key={metric.title} className={mobileStyles.metricChipWrapper}>
        <button
          type="button"
          className={chipClassName}
          onClick={() => {
            if (isBallparkMetric) {
              setBallparkModalOpen(true);
              return;
            }
            if (isBudgetedMetric) {
              activateBudgetedMetric();
              return;
            }
            if (isReconciledToggleMetric) {
              const isSelected =
                selectedMetric === metric.title ||
                selectedMetric === (showReconciled ? "Reconciled Cost" : "Actual Cost");

              if (!isSelected) {
                activateActualMetric();
                return;
              }

              const nextShowReconciled = !showReconciled;
              setShowReconciled(nextShowReconciled);
              const nextTitle = nextShowReconciled
                ? ("Reconciled Cost" as MetricTitle)
                : ("Actual Cost" as MetricTitle);
              const nextBasis = nextShowReconciled ? "Reconciled" : "Actual";
              setSelectedMetric(nextTitle);
              setMarkupBasis(nextBasis);
              return;
            }
            if (metric.field) {
              setSelectedMetric(metric.title);
              if (
                metric.title === "Actual Cost" ||
                metric.title === "Reconciled Cost"
              ) {
                setMarkupBasis(metric.title === "Reconciled Cost" ? "Reconciled" : "Actual");
              }
            }
          }}
          disabled={!metric.field && !isBallparkMetric}
          aria-label={
            isBallparkMetric
              ? "Edit estimate"
              : metric.field
              ? undefined
              : metric.title
          }
        >
          <div className={mobileStyles.metricChipHeader}>
            <span className={tagClassName}>{metric.tag}</span>
          </div>
          <span className={mobileStyles.metricValue}>{metric.value}</span>
          <span className={mobileStyles.metricDescription}>{metric.description}</span>
        </button>
      </div>
    );
  };

  const mobileContent = (
    <div className={mobileStyles.card} style={mobileAccentStyle}>
      <div className={mobileStyles.headerRow}>
        <div className={mobileStyles.titleGroup}>
          <span>Budget</span>
          <button
            type="button"
            className={mobileStyles.iconButton}
            onClick={openInvoicePreview}
            aria-label="Invoice preview"
            disabled={!budgetHeader}
          >
            <FontAwesomeIcon icon={faFileInvoiceDollar} />
          </button>
        </div>
        <button
          type="button"
          className={mobileStyles.revisionButton}
          onClick={onOpenRevisionModal}
          disabled={!budgetHeader}
        >
          {`Rev.${budgetHeader?.revision ?? 1}`}
        </button>
      </div>

      <div className={mobileStyles.summaryLayout}>
        <div className={mobileStyles.summaryColumn}>
          <div className={mobileStyles.summaryCard}>
            <div className={mobileStyles.summaryCardHeader}>
              <span className={mobileStyles.summaryCardTitle}>
                <FontAwesomeIcon
                  icon={finalMetricIcon}
                  className={mobileStyles.summaryCardTitleIcon}
                />
                {finalMetricTag}
              </span>
            </div>
            <span className={mobileStyles.summaryCardValue}>{finalDisplay}</span>
            <span className={mobileStyles.summaryCardDescription}>
              {finalMetricDescription}
            </span>
            <span className={mobileStyles.summaryCardDate}>{createdDateLabel}</span>
          </div>
        </div>
        <div className={mobileStyles.chartContainer}>
          <BudgetDonut
            data={chartState.slices}
            total={chartState.total}
            palette={chartState.palette}
            formatTooltip={formatTooltip}
            totalFormatter={totalFormatter}
          />
        </div>
      </div>

      <div className={mobileStyles.metricGrid}>
        <div className={`${mobileStyles.metricRow} ${mobileStyles.metricRowTop}`}>
          {topMetrics.map((metric) => renderMetricChip(metric))}
        </div>
        <div className={`${mobileStyles.metricRow} ${mobileStyles.metricRowBottom}`}>
          {bottomMetrics.map((metric) => renderMetricChip(metric))}
        </div>
      </div>

      <div className={mobileStyles.groupControls}>
        <span id="budget-mobile-group-label" className={mobileStyles.srOnly}>
          Group budget items
        </span>
        <div
          className={mobileStyles.groupTabs}
          role="group"
          aria-labelledby="budget-mobile-group-label"
        >
          {groupOptions.map((option) => {
            const isActive = option.value === groupBy;
            const className = isActive
              ? `${toolbarStyles.tabButton} ${toolbarStyles.activeTab}`
              : toolbarStyles.tabButton;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                className={className}
                onClick={() => setGroupBy(option.value)}
              >
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {isMobile ? mobileContent : desktopContent}

      <EditBallparkModal
        isOpen={isBallparkModalOpen}
        onRequestClose={() => setBallparkModalOpen(false)}
        onSubmit={handleBallparkSave}
        initialValue={toNumber(budgetHeader?.headerBallPark)}
        accentColor={accentHex}
      />

      <ClientInvoicePreviewModal
        isOpen={isInvoicePreviewOpen}
        onRequestClose={closeInvoicePreview}
        revision={invoiceRevision as unknown as { revision?: number; [k: string]: unknown }}
        project={activeProject as unknown as { projectId: string; [k: string]: unknown }}
      />
    </div>
  );
};

export default BudgetHeader;
