import React, { useState, useMemo, useCallback, useEffect } from "react";

import { CircleDollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/app/contexts/useData";
import { formatUSD } from "@/shared/utils/budgetUtils";
import { slugify } from "@/shared/utils/slug";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoiceDollar, faSpinner } from "@fortawesome/free-solid-svg-icons";
import ClientInvoicePreviewModal from "@/features/project/components/ClientInvoicePreviewModal";
import { useBudget } from "@/features/budget/context/BudgetContext";
import VisxPieChart, { SliceInteractionType } from "@/features/budget/components/VisxPieChart";
import { generateSequentialPalette, getColor } from "@/shared/utils/colorUtils";


type BudgetHeaderData = {
  headerFinalTotalCost?: number | null;
  headerBallPark?: number | null;
  headerBudgetedTotalCost?: number | null;
  headerActualTotalCost?: number | null;
  headerEffectiveMarkup?: number | null; // e.g. 0.25 for 25%
  createdAt?: string | number | Date | null;
  revision?: number | null;
  clientRevisionId?: number | null;
  // Include other fields if your app uses them
};

type PieDatum = { name: string; value: number };

interface BudgetOverviewCardProps {
  projectId?: string;
}

const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({ projectId }) => {
  const { activeProject, isAdmin } = useData();
  const { budgetHeader, loading, refresh, getStats, getPie } = useBudget();
  const navigate = useNavigate();

  const [groupBy] = useState<"invoiceGroup" | "none">("invoiceGroup");
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoiceRevision, setInvoiceRevision] = useState<BudgetHeaderData | null>(null);
  const [hoverSliceName, setHoverSliceName] = useState<string | null>(null);
  const [persistentSliceName, setPersistentSliceName] = useState<string | null>(null);
  const [hasUserSelection, setHasUserSelection] = useState(false);

  // Use context selectors for memoized data
  const stats = getStats();
  const pieData: PieDatum[] = getPie(groupBy);
  const ballparkValue = stats.ballpark;

  const totalPieValue = useMemo(() => {
    return pieData.reduce((sum, d) => sum + d.value, 0);
  }, [pieData]);

  const pieDataSorted = useMemo(
    () => [...pieData].sort((a, b) => b.value - a.value),
    [pieData]
  );

  const fallbackSliceName = useMemo(() => pieDataSorted[0]?.name ?? null, [pieDataSorted]);

  useEffect(() => {
    setPersistentSliceName((prev) => {
      if (prev && pieDataSorted.some((d) => d.name === prev)) {
        return prev;
      }
      return fallbackSliceName;
    });
  }, [pieDataSorted, fallbackSliceName]);

  useEffect(() => {
    setHasUserSelection((prev) => {
      if (!prev) return prev;
      if (!persistentSliceName) return false;
      return pieDataSorted.some((d) => d.name === persistentSliceName);
    });
  }, [pieDataSorted, persistentSliceName]);

  const displayedSliceName = hoverSliceName ?? persistentSliceName ?? fallbackSliceName;
  const chartActiveSliceName = hoverSliceName ?? (hasUserSelection ? persistentSliceName : null);
  const activeIndex = useMemo(
    () => (displayedSliceName ? pieDataSorted.findIndex((d) => d.name === displayedSliceName) : -1),
    [displayedSliceName, pieDataSorted]
  );
  const activeDatum = activeIndex >= 0 ? pieDataSorted[activeIndex] : undefined;
  const activeColor = activeIndex >= 0 && colors.length > 0 ? colors[activeIndex % colors.length] : undefined;
  const activePercent = activeDatum && totalPieValue > 0 ? (activeDatum.value / totalPieValue) * 100 : null;

  const formattedPercent = useMemo(() => {
    if (activePercent == null) return null;
    const digits = activePercent >= 10 ? 0 : 1;
    return `${activePercent.toFixed(digits)}% of total`;
  }, [activePercent]);

  const handleSliceInteraction = useCallback(
    (datum: PieDatum | null, interactionType: SliceInteractionType) => {
      if (interactionType === "hover") {
        setHoverSliceName(datum?.name ?? null);
        return;
      }

      setHoverSliceName(null);

      if (datum) {
        setPersistentSliceName(datum.name);
        setHasUserSelection(true);
      } else {
        setPersistentSliceName(fallbackSliceName);
        setHasUserSelection(false);
      }
    },
    [fallbackSliceName]
  );

  const colors = useMemo(() => {
    const base = activeProject?.color || getColor(projectId);
    if (typeof base !== "string") {
      console.error("Invalid color base", base);
      return [];
    }
    return generateSequentialPalette(base, pieDataSorted.length).reverse();
  }, [pieDataSorted.length, projectId, activeProject?.color]);

  const formatTooltip = useCallback(
    (d: PieDatum) => {
      const isPercent = groupBy === "none" && d.name === "Effective Markup";
      const rounded = Math.round(d.value);
      return `${d.name}: ${isPercent ? `${rounded}%` : formatUSD(rounded)}`;
    },
    [groupBy]
  );

  const openInvoicePreview = async (): Promise<void> => {
    if (!projectId) return;
    try {
      const data = await refresh();
      if (data && "header" in data && data.header) {
        setInvoiceRevision(data.header as BudgetHeaderData);
        setIsInvoicePreviewOpen(true);
      }
    } catch (err) {
      console.error("Failed to load invoice", err);
    }
  };

  const closeInvoicePreview = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e && "stopPropagation" in e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    setIsInvoicePreviewOpen(false);
    // Restore focus state after modal close
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && typeof active.blur === "function") {
        active.blur();
      }
    }, 0);
  };
  const openBudgetPage = () => {
    if (!activeProject || !isAdmin) return;
    const slug = slugify(activeProject.title ?? "");
    navigate(`/dashboard/projects/${slug}/budget`);
  };



  return (
    <div
      className="dashboard-item budget budget-component-container"
      onClick={isAdmin ? openBudgetPage : undefined}
      style={{ cursor: isAdmin ? "pointer" : "default", position: "relative" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <CircleDollarSign size={26} style={{ marginRight: "12px" }} />
          Budget
          {budgetHeader?.clientRevisionId != null && (
            <span style={{ marginLeft: "8px", fontSize: "0.9rem", color: "#666" }}>
              {`Rev.${budgetHeader.clientRevisionId}`}
            </span>
          )}
        </span>

        {loading ? (
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            style={{ marginTop: "8px" }}
            aria-label="Loading budget"
          />
        ) : (
          <>
            <span
              style={{
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {budgetHeader ? formatUSD(ballparkValue) : "Not available"}
              {budgetHeader && (
                <FontAwesomeIcon
                  icon={faFileInvoiceDollar}
                  style={{ fontSize: "1.75rem", cursor: "pointer", marginLeft: "8px" }}
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
              )}
            </span>

            <span style={{ marginTop: "8px" }}>
              {(() => {
                const createdAt = budgetHeader?.createdAt;
                return createdAt ? new Date(createdAt as string | number | Date).toLocaleDateString() : "No date";
              })()}
            </span>
          </>
        )}
      </div>

      {loading ? (
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <FontAwesomeIcon icon={faSpinner} spin aria-label="Loading chart" />
        </div>
      ) : (
        budgetHeader && (
          <>
            <div className="chart-legend-container">
              <div className="budget-chart">
                <VisxPieChart
                  data={pieDataSorted}
                  total={totalPieValue}
                  colors={colors}
                  formatTooltip={formatTooltip}
                  colorMode="sequential"
                  activeSliceName={chartActiveSliceName}
                  onActiveSliceChange={handleSliceInteraction}
                />
              </div>
              <div className="budget-active-summary" aria-live="polite">
                <div className="budget-active-title">
                  {activeColor && (
                    <span
                      className="budget-legend-dot budget-active-dot"
                      style={{ background: activeColor }}
                    />
                  )}
                  <span>{activeDatum ? activeDatum.name : "Explore budget"}</span>
                </div>
                {activeDatum ? (
                  <>
                    <span className="budget-active-value">
                      {formatUSD(Math.round(activeDatum.value))}
                    </span>
                    {formattedPercent && (
                      <span className="budget-active-percent">{formattedPercent}</span>
                    )}
                  </>
                ) : (
                  <span className="budget-active-placeholder">
                    Hover or tap a slice to see details.
                  </span>
                )}
              </div>
            </div>
          </>
        )
      )}

      <ClientInvoicePreviewModal
        isOpen={isInvoicePreviewOpen}
        onRequestClose={closeInvoicePreview}
        revision={invoiceRevision}
        project={activeProject}
      />
    </div>
  );
};

export default React.memo(BudgetOverviewCard, (prev, next) =>
  prev.projectId === next.projectId
);
