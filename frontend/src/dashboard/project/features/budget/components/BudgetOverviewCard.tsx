import React, { useState, useMemo, useCallback } from "react";

import { CircleDollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/app/contexts/useData";
import { formatUSD } from "@/shared/utils/budgetUtils";
import { getProjectDashboardPath } from "@/shared/utils/projectUrl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoiceDollar, faSpinner } from "@fortawesome/free-solid-svg-icons";
import ClientInvoicePreviewModal from "@/dashboard/project/components/Shared/ClientInvoicePreviewModal";
import { useBudget } from "@/dashboard/project/features/budget/context/BudgetContext";
import VisxPieChart from "@/dashboard/project/features/budget/components/VisxPieChart";
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

  const colors = useMemo(() => {
    const base = activeProject?.color || getColor(projectId);
    if (typeof base !== "string") {
      console.error("Invalid color base", base);
      return [];
    }
    return generateSequentialPalette(base, pieDataSorted.length).reverse();
  }, [pieDataSorted.length, projectId, activeProject?.color]);

  const formatDatumValue = useCallback(
    (d: PieDatum) => {
      const isPercent = groupBy === "none" && d.name === "Effective Markup";
      const rounded = Math.round(d.value);
      return isPercent ? `${rounded}%` : formatUSD(rounded);
    },
    [groupBy]
  );

  const formatTooltip = useCallback(
    (d: PieDatum) => `${d.name}: ${formatDatumValue(d)}`,
    [formatDatumValue]
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
    navigate(
      getProjectDashboardPath(activeProject.projectId, activeProject.title, "/budget")
    );
  };



  return (
    <div
      className="dashboard-item budget"
      onClick={isAdmin ? openBudgetPage : undefined}
      style={{ cursor: isAdmin ? "pointer" : "default", position: "relative" }}
    >
      <div className="budget-overview-card budget-component-container">
        <div className="budget-overview-header">
          <div className="budget-title-row">
            <CircleDollarSign className="budget-title-icon" size={26} />
            <span className="budget-title-text">Budget</span>
            {budgetHeader?.clientRevisionId != null && (
              <span className="budget-revision">{`Rev.${budgetHeader.clientRevisionId}`}</span>
            )}
          </div>

          {loading ? (
            <FontAwesomeIcon
              icon={faSpinner}
              spin
              className="budget-spinner"
              aria-label="Loading budget"
            />
          ) : (
            <>
              <div className="budget-summary">
                <span className="budget-amount">
                  {budgetHeader ? formatUSD(ballparkValue) : "Not available"}
                </span>
                {budgetHeader && (
                  <FontAwesomeIcon
                    icon={faFileInvoiceDollar}
                    className="budget-invoice-icon"
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
              </div>

              <span className="budget-updated">
                {(() => {
                  const createdAt = budgetHeader?.createdAt;
                  return createdAt
                    ? new Date(createdAt as string | number | Date).toLocaleDateString()
                    : "No date";
                })()}
              </span>
            </>
          )}
        </div>

        {loading ? (
          <div className="budget-loading-chart">
            <FontAwesomeIcon icon={faSpinner} spin aria-label="Loading chart" />
          </div>
        ) : (
          budgetHeader && (
            <div className="chart-legend-container budget-chart-wrapper">
              <div className="budget-chart">
                <VisxPieChart
                  data={pieDataSorted}
                  total={totalPieValue}
                  colors={colors}
                  formatTooltip={formatTooltip}
                  colorMode="sequential"
                />
              </div>
            </div>
          )
        )}
      </div>

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











