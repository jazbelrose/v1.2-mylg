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
      className="dashboard-item budget budget-component-container budget-overview-card"
      onClick={isAdmin ? openBudgetPage : undefined}
      style={{ cursor: isAdmin ? "pointer" : "default", position: "relative" }}
    >
      <div className="budget-overview-summary">
        <span className="budget-overview-header">
          <CircleDollarSign size={26} className="budget-overview-icon" />
          Budget
          {budgetHeader?.clientRevisionId != null && (
            <span className="budget-overview-revision">{`Rev.${budgetHeader.clientRevisionId}`}</span>
          )}
        </span>

        {loading ? (
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            className="budget-overview-spinner"
            aria-label="Loading budget"
          />
        ) : (
          <>
            <span className="budget-overview-amount">
              {budgetHeader ? formatUSD(ballparkValue) : "Not available"}
              {budgetHeader && (
                <FontAwesomeIcon
                  icon={faFileInvoiceDollar}
                  className="budget-overview-invoice-icon"
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

            <span className="budget-overview-date">
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
                />
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











