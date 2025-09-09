import React, { useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faClone, faClock } from "@fortawesome/free-solid-svg-icons";
import { Tooltip as AntTooltip } from "antd";
import { useBudget } from "@/features/budget/context/BudgetContext";
import { formatUSD } from "../../../shared/utils/budgetUtils";
import styles from "@/features/budget/pages/budget-page.module.css";

type TableColumn = Record<string, unknown>;
type TableData = Record<string, unknown>;

interface BudgetTableLogicProps {
  groupBy: string;
  sortField: string | null;
  sortOrder: string | null;
  selectedRowKeys: string[];
  expandedRowKeys: string[];
  eventsByLineItem: Record<string, Record<string, unknown>[]>;  
  setSelectedRowKeys: (keys: string[]) => void;
  openDeleteModal: (ids: string[]) => void;
  openDuplicateModal: (item: Record<string, unknown>) => void;
  openEventModal: (item: Record<string, unknown>) => void;
  children: (tableConfig: BudgetTableConfig) => React.ReactNode;
}interface BudgetTableConfig {
  tableColumns: TableColumn[];
  tableData: TableData[];
  sortedTableData: TableData[];
  groupedTableData: TableData[];
  expandedRowRender: (record: TableData) => React.ReactNode;
  mainColumnsOrder: string[];
}

const BudgetTableLogic: React.FC<BudgetTableLogicProps> = ({
  groupBy,
  sortField,
  sortOrder,
  selectedRowKeys,
  expandedRowKeys,
  eventsByLineItem,
  setSelectedRowKeys,
  openDeleteModal,
  openDuplicateModal,
  openEventModal,
  children,
}) => {
  const { getRows } = useBudget();
  
  // Use context selectors for data
  const budgetItems = getRows();

  const beautifyLabel = useCallback((key: string) => {
    if (!key) return "";
    const abbreviations = { po: "PO", id: "ID", url: "URL" };
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(/\s+/)
      .map((w) => {
        const lower = w.toLowerCase();
        return abbreviations[lower] || w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  }, []);

  const isDefined = useCallback((val: unknown) => {
    if (val === undefined || val === null) return false;
    const str = String(val).trim();
    if (!str) return false;
    const num = parseFloat(str.replace(/[$,]/g, ""));
    if (!Number.isNaN(num)) {
      return num !== 0;
    }
    return str !== "0";
  }, []);

  const getActiveCostKey = useCallback(
    (item: Record<string, unknown>) => {
      if (isDefined(item.itemReconciledCost)) return "itemReconciledCost";
      if (isDefined(item.itemActualCost)) return "itemActualCost";
      return "itemBudgetedCost";
    },
    [isDefined]
  );

  const baseColumnsOrder = useMemo(() => [
    "elementKey",
    "elementId",
    "description",
    "quantity",
    "unit",
    "itemBudgetedCost",
    "itemActualCost",
    "itemReconciledCost",
    "itemMarkUp",
    "itemFinalCost",
    "paymentStatus",
  ], []);

  const mainColumnsOrder = useMemo(
    () =>
      groupBy !== "none" ? [groupBy, ...baseColumnsOrder] : baseColumnsOrder,
    [groupBy, baseColumnsOrder]
  );

  const columnHeaderMap = useMemo(() => ({
    elementKey: "Element Key",
    elementId: "Element ID",
    category: "Category",
    areaGroup: "Area Group",
    invoiceGroup: "Invoice Group",
    description: "Description",
    quantity: "Quantity",
    unit: "Unit",
    dates: "Dates",
    itemBudgetedCost: "Budgeted Cost",
    itemActualCost: "Actual Cost",
    itemReconciledCost: "Reconciled Cost",
    itemMarkUp: "Markup",
    itemFinalCost: "Final Cost",
    paymentStatus: "Payment Status",
  }), []);

  const renderPaymentStatus = useCallback((status: string) => {
    const cleaned = (status || "")
      .replace(/[·.]+$/, "")
      .trim();
    const normalizedStatus = cleaned.toUpperCase();
    const colorClass =
      normalizedStatus === "PAID"
        ? styles.paid
        : normalizedStatus === "PARTIAL"
        ? styles.partial
        : styles.unpaid;
    const display =
      normalizedStatus === "PAID" || normalizedStatus === "PARTIAL"
        ? cleaned
        : "UNPAID";
    return (
      <span className={styles.paymentStatus}>
        {display}
        <span className={`${styles.statusDot} ${colorClass}`} />
      </span>
    );
  }, []);

  const tableColumns = useMemo(() => {
    const hidden = [
      "projectId",
      "budgetItemId",
      "budgetId",
      "title",
      "startDate",
      "endDate",
      "itemCost",
    ];
    const safeBudgetItems = budgetItems.filter(Boolean);
    const available = safeBudgetItems.length
      ? Array.from(
          new Set([
            ...mainColumnsOrder,
            ...safeBudgetItems.flatMap((it) => Object.keys(it)),
          ])
        ).filter((key) => !hidden.includes(key))
      : mainColumnsOrder;
    const costKeys = [
      "itemBudgetedCost",
      "itemActualCost",
      "itemReconciledCost",
      "itemFinalCost",
    ];
    const allIds = safeBudgetItems.map((it) => String(it.budgetItemId));
    const cols = mainColumnsOrder
      .map((key) => {
        if (key === "dates") {
          return {
            title: columnHeaderMap[key],
            dataIndex: "dates",
            key: "dates",
          };
        }
        if (available.includes(key)) {
          const base: TableColumn = {
            title: columnHeaderMap[key] || key,
            dataIndex: key,
            key,
            sorter: () => 0,
            sortOrder: sortField === key ? sortOrder : null,
          };
          if (key === "elementKey") {
            base.title = (
              <span className={styles.elementKeyCell}>
                <input
                  type="checkbox"
                  checked={
                    allIds.length > 0 && selectedRowKeys.length === allIds.length
                  }
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        selectedRowKeys.length > 0 &&
                        selectedRowKeys.length < allIds.length;
                    }
                  }}
                  onChange={(e) => {
                    const { checked } = e.target;
                    setSelectedRowKeys(checked ? allIds : []);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ marginLeft: "15px" }}>{columnHeaderMap[key]}</span>
              </span>
            );
            base.render = (value: unknown, record: TableData) => (
              <span className={styles.elementKeyCell}>
                <input
                  type="checkbox"
                  checked={selectedRowKeys.includes(String(record.budgetItemId))}
                  onChange={(e) => {
                    const { checked } = e.target;
                    const next = checked
                      ? Array.from(new Set([...selectedRowKeys, String(record.budgetItemId)]))
                      : selectedRowKeys.filter((k) => k !== String(record.budgetItemId));
                    setSelectedRowKeys(next);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ marginLeft: "15px" }}>{String(value)}</span>
              </span>
            );
          }
          if (key === "paymentStatus") {
            base.align = "right";
            base.render = renderPaymentStatus;
          } else if (key === "itemMarkUp") {
            base.render = (value: unknown) =>
              typeof value === "number" ? `${Math.round(value * 100)}%` : String(value);
          } else if (costKeys.includes(key)) {
            base.render = (value: unknown, record: TableData) => {
              if (!isDefined(value)) return "";
              if (key === "itemFinalCost") {
                return <span>{formatUSD(Number(value))}</span>;
              }
              const activeKey = getActiveCostKey(record);
              const className = activeKey === key ? undefined : styles.dimmed;
              return <span className={className}>{formatUSD(Number(value))}</span>;
            };
          }
          if (groupBy !== "none" && key === groupBy) {
            base.className = styles.groupColumn;
            const origRender = base.render as ((value: unknown, record: TableData, index: number) => React.ReactNode) | undefined;
            base.render = (value: unknown, record: TableData, index: number) => {
              const span = record[`${groupBy}RowSpan`];
              const children = origRender
                ? origRender(value, record, index)
                : String(value);
              return { children, props: { rowSpan: span } };
            };
          }
          return base;
        }
        return null;
      })
      .filter(Boolean);

    cols.push({
      title: "",
      key: "events",
      align: "center",
      render: (_v: unknown, record: TableData) => {
        const events = eventsByLineItem[String(record.budgetItemId)] || [];
        const count = events.length;
        const tooltipContent = events.length
          ? (
              <div>
                {events.map((ev, i) => (
                  <div key={i}>
                    {new Date(String(ev.date)).toLocaleDateString()} - {String(ev.hours)} hrs
                    {ev.description ? ` - ${String(ev.description)}` : ""}
                  </div>
                ))}
              </div>
            )
          : "No events";
        return (
          <AntTooltip title={tooltipContent} placement="top">
            <button
              className={styles.calendarButton}
              onClick={(e) => {
                e.stopPropagation();
                openEventModal(record);
              }}
              aria-label="Manage events"
            >
              <FontAwesomeIcon icon={faClock} />
              {count > 0 && <span className={styles.eventBadge}>{count}</span>}
            </button>
          </AntTooltip>
        );
      },
      width: 40,
    });
    cols.push({
      title: "",
      key: "actions",
      align: "center",
      render: (_value: unknown, record: TableData) => (
        <div className={styles.actionButtons}>
          <button
            className={styles.duplicateButton}
            onClick={(e) => {
              e.stopPropagation();
              openDuplicateModal(record);
            }}
            aria-label="Duplicate line item"
          >
            <FontAwesomeIcon icon={faClone} />
          </button>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal([String(record.budgetItemId)]);
            }}
            aria-label="Delete line item"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      ),
      width: 60,
    });
    return cols;
  }, [
    budgetItems,
    groupBy,
    mainColumnsOrder,
    sortField,
    sortOrder,
    selectedRowKeys,
    eventsByLineItem,
    setSelectedRowKeys,
    renderPaymentStatus,
    isDefined,
    getActiveCostKey,
    openEventModal,
    openDuplicateModal,
    openDeleteModal,
    columnHeaderMap,
  ]);

  const tableData = useMemo(
    () =>
      budgetItems.map((item) => ({
        ...item,
        key: item.budgetItemId,
      })),
    [budgetItems]
  );

  const sortedTableData = useMemo(() => {
    const compareValues = (a: unknown, b: unknown) => {
      if (a === b) return 0;
      if (a === undefined || a === null) return -1;
      if (b === undefined || b === null) return 1;
      if (typeof a === "number" && typeof b === "number") {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    };

    const data = tableData.slice();

    data.sort((a, b) => {
      if (groupBy !== "none") {
        const groupComp = compareValues(a[groupBy], b[groupBy]);
        if (groupComp !== 0) {
          // If sorting the group column itself allow descend/ascend
          if (sortField === groupBy && sortOrder === "descend") {
            return -groupComp;
          }
          return groupComp;
        }
      }

      if (sortField && sortField !== groupBy) {
        const fieldComp = compareValues(a[sortField], b[sortField]);
        return sortOrder === "descend" ? -fieldComp : fieldComp;
      }

      return 0;
    });

    return data;
  }, [tableData, groupBy, sortField, sortOrder]);

  const groupedTableData = useMemo(() => {
    if (groupBy === "none") {
      return sortedTableData.map((row) => ({ ...row }));
    }

    const result = [];
    let i = 0;

    while (i < sortedTableData.length) {
      const current = sortedTableData[i][groupBy];
      let j = i + 1;
      while (j < sortedTableData.length && sortedTableData[j][groupBy] === current) {
        j++;
      }

      const groupRows = sortedTableData.slice(i, j);
      const expandedCount = groupRows.filter((r) => expandedRowKeys.includes(String(r.key))).length;
      const span = groupRows.length + expandedCount;

      for (let k = i; k < j; k++) {
        const row = { ...sortedTableData[k] };
        row[`${groupBy}RowSpan`] = k === i ? span : 0;
        result.push(row);
      }

      i = j;
    }

    return result;
  }, [sortedTableData, groupBy, expandedRowKeys]);

  const detailOrder = useMemo(() => [
    "paymentTerms",
    "paymentType",
    null,
    "vendor",
    "vendorInvoiceNumber",
    "poNumber",
    null,
    "client",
    "amountPaid",
    "balanceDue",
    null,
    "areaGroup",
    "invoiceGroup",
    "category",
  ], []);

  const expandedRowRender = useCallback(
    (record: TableData) => {
      const notes = record.notes;
      return (
        <table>
          <tbody>
            {(record.startDate || record.endDate) && (
              <tr key="dates">
                <td style={{ fontWeight: "bold", paddingRight: "8px" }}>Dates</td>
                <td style={{ textAlign: "right" }}>
                  {`${String(record.startDate || "")}${
                    record.endDate ? ` - ${String(record.endDate)}` : ""
                  }`}
                </td>
              </tr>
            )}
            {detailOrder.map((key, idx) =>
              key === null ? (
                <tr key={`hr-${idx}`}>
                  <td colSpan={2}>
                    <hr style={{ margin: "8px 0", borderColor: "#444" }} />
                  </td>
                </tr>
              ) : (
                <tr key={key}>
                  <td style={{ fontWeight: "bold", paddingRight: "8px" }}>
                    {beautifyLabel(key)}
                  </td>
                  <td style={{ textAlign: "right" }}>{String(record[key] ?? "")}</td>
                </tr>
              )
            )}
            <tr key="notes-divider">
              <td colSpan={2}>
                <hr style={{ margin: "8px 0", borderColor: "#444" }} />
              </td>
            </tr>
            <tr key="notes">
              <td style={{ fontWeight: "bold", paddingRight: "8px" }}>Notes</td>
              <td
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 3,
                  color: notes ? "inherit" : "#888",
                  textAlign: "right",
                }}
              >
                {String(notes || "No notes available")}
              </td>
            </tr>
          </tbody>
        </table>
      );
    },
    [beautifyLabel, detailOrder]
  );

  const tableConfig: BudgetTableConfig = useMemo(() => ({
    tableColumns,
    tableData,
    sortedTableData,
    groupedTableData,
    expandedRowRender,
    mainColumnsOrder,
  }), [tableColumns, tableData, sortedTableData, groupedTableData, expandedRowRender, mainColumnsOrder]);

  return <>{children(tableConfig)}</>;
};

export default BudgetTableLogic;
