import React, { useCallback, useMemo } from "react";
import { Pagination } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faClock, faTrash } from "@fortawesome/free-solid-svg-icons";
import styles from "@/dashboard/project/features/budget/pages/budget-page.module.css";
import { formatUSD } from "@/shared/utils/budgetUtils";
type BudgetItem = Record<string, unknown> & {
  budgetItemId: string;
  key: string;
};

interface BudgetItemsTableProps {
  dataSource: BudgetItem[];
  columns: ColumnsType<BudgetItem>;
  selectedRowKeys: string[];
  setSelectedRowKeys: (keys: string[] | ((prev: string[]) => string[])) => void;
  lockedLines: string[];
  handleTableChange: TableProps<BudgetItem>['onChange'];
  openEditModal: (record: BudgetItem) => void;
  openDuplicateModal: (record: BudgetItem) => void;
  openDeleteModal: (ids: string[]) => void;
  openEventModal: (record: BudgetItem) => void;
  eventsByLineItem: Record<string, Record<string, unknown>[]>;
  tableRef: React.RefObject<HTMLDivElement>;
  tableHeight: number;
  pageSize: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

const BudgetItemsTable: React.FC<BudgetItemsTableProps> = React.memo(
  ({
    dataSource,
    columns: _columns,
    selectedRowKeys,
    setSelectedRowKeys,
    lockedLines,
    handleTableChange: _handleTableChange,
    openEditModal,
    openDuplicateModal,
    openDeleteModal,
    openEventModal,
    eventsByLineItem,
    tableRef,
    tableHeight,
    pageSize,
    currentPage,
    setCurrentPage,
    setPageSize,
  }) => {
    void _columns;
    void _handleTableChange;

    const costKeys = useMemo(
      () => [
        "itemBudgetedCost",
        "itemActualCost",
        "itemReconciledCost",
        "itemFinalCost",
      ],
      []
    );

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
      (item: BudgetItem) => {
        if (isDefined(item.itemReconciledCost)) return "itemReconciledCost";
        if (isDefined(item.itemActualCost)) return "itemActualCost";
        return "itemBudgetedCost";
      },
      [isDefined]
    );

    const mobileMetrics = useMemo(
      () => [
        { key: "quantity", label: "Qty" },
        { key: "unit", label: "U" },
        { key: "itemBudgetedCost", label: "BC" },
        { key: "itemActualCost", label: "AC" },
        { key: "itemReconciledCost", label: "RC" },
        { key: "itemMarkUp", label: "MK" },
        { key: "itemFinalCost", label: "FC" },
      ],
      []
    );

    const handleCardKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLElement>, record: BudgetItem, isLocked: boolean) => {
        if (isLocked) return;
        if (event.key === "Enter") {
          event.preventDefault();
          openEditModal(record);
        } else if (event.key === " ") {
          event.preventDefault();
          openDeleteModal([record.budgetItemId]);
        }
      },
      [openDeleteModal, openEditModal]
    );

    const toggleSelection = useCallback(
      (record: BudgetItem, checked: boolean) => {
        const id = String(record.budgetItemId);
        setSelectedRowKeys((prevKeys) => {
          const nextKeys = new Set(prevKeys);
          if (checked) {
            nextKeys.add(id);
          } else {
            nextKeys.delete(id);
          }
          return Array.from(nextKeys);
        });
      },
      [setSelectedRowKeys]
    );

    const paginatedData = useMemo(() => {
      const startIndex = Math.max(0, (currentPage - 1) * pageSize);
      return dataSource.slice(startIndex, startIndex + pageSize);
    }, [dataSource, currentPage, pageSize]);

    const formatMetricValue = useCallback(
      (record: BudgetItem, metricKey: string) => {
        const value = record[metricKey];
        if (metricKey === "itemMarkUp") {
          if (typeof value === "number") {
            return `${Math.round(value * 100)}%`;
          }
          return value ? String(value) : "—";
        }

        if (costKeys.includes(metricKey)) {
          if (!isDefined(value)) return "—";
          if (metricKey === "itemFinalCost") {
            return formatUSD(Number(value));
          }
          const activeKey = getActiveCostKey(record);
          const formatted = formatUSD(Number(value));
          return activeKey === metricKey
            ? formatted
            : (
                <span className={styles.dimmed}>{formatted}</span>
              );
        }

        if (value === undefined || value === null || value === "") {
          return "—";
        }

        return String(value);
      },
      [costKeys, getActiveCostKey, isDefined]
    );

    const renderPaymentStatus = useCallback(
      (status: unknown) => {
        if (typeof status !== "string") return null;
        const cleaned = status.replace(/[·.]+$/, "").trim();
        if (!cleaned) return null;
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
      },
      []
    );

    const handlePaginationChange = useCallback(
      (page: number, size: number) => {
        setCurrentPage(page);
        if (size !== pageSize) {
          setPageSize(size);
        }
      },
      [pageSize, setCurrentPage, setPageSize]
    );

    return (
      <div ref={tableRef} className={styles.tableContainer}>
        <div
          className={styles.mobileCardList}
          style={{ minHeight: tableHeight || undefined }}
        >
          {dataSource.length === 0 ? (
            <div className={styles.emptyPlaceholder}>No budget items to display</div>
          ) : (
            <>
              {paginatedData.map((record) => {
                  const isSelected = selectedRowKeys.includes(record.budgetItemId);
                  const isLocked = lockedLines.includes(record.budgetItemId);
                  const events = eventsByLineItem[record.budgetItemId] || [];
                  const eventCount = events.length;

                  return (
                    <article
                      key={record.key}
                      className={`${styles.mobileCard}${
                        isSelected ? ` ${styles.mobileCardSelected}` : ""
                      }${isLocked ? ` ${styles.mobileCardLocked}` : ""}`}
                      role="button"
                      tabIndex={isLocked ? -1 : 0}
                      aria-pressed={isSelected}
                      aria-disabled={isLocked}
                      onClick={() => {
                        if (!isLocked) {
                          openEditModal(record);
                        }
                      }}
                      onKeyDown={(event) => handleCardKeyDown(event, record, isLocked)}
                    >
                      <header className={styles.mobileCardHeader}>
                        <div className={styles.mobileCardHeaderLeft}>
                          <label className={styles.mobileCardCheckbox}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isLocked}
                              onChange={(event) => {
                                event.stopPropagation();
                                toggleSelection(record, event.target.checked);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              aria-label="Select budget line item"
                            />
                          </label>
                          <div className={styles.mobileCardIdentifiers}>
                            <span className={styles.mobileCardKey}>
                              {String(record.elementKey ?? "—")}
                            </span>
                            {record.elementId && (
                              <span className={styles.mobileCardId}>
                                {String(record.elementId)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.mobileCardControls}>
                          <button
                            className={styles.mobileIconButton}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEventModal(record);
                            }}
                            aria-label={
                              eventCount > 0
                                ? `Manage ${eventCount} scheduled events`
                                : "Manage events"
                            }
                          >
                            <FontAwesomeIcon icon={faClock} />
                            {eventCount > 0 && (
                              <span className={styles.mobileEventBadge}>{eventCount}</span>
                            )}
                          </button>
                          <button
                            className={styles.mobileIconButton}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDuplicateModal(record);
                            }}
                            aria-label="Duplicate line item"
                          >
                            <FontAwesomeIcon icon={faClone} />
                          </button>
                          <button
                            className={styles.mobileIconButton}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteModal([record.budgetItemId]);
                            }}
                            aria-label="Delete line item"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </header>

                      <div className={styles.mobileCardDescription}>
                        {record.description ? String(record.description) : "No description"}
                      </div>

                      <div className={styles.mobileCardMetrics}>
                        {mobileMetrics.map((metric) => (
                          <div key={metric.key} className={styles.mobileCardMetric}>
                            <span className={styles.mobileCardMetricLabel}>{metric.label}</span>
                            <span className={styles.mobileCardMetricValue}>
                              {formatMetricValue(record, metric.key)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {record.paymentStatus && (
                        <footer className={styles.mobileCardFooter}>
                          <span className={styles.mobileCardFooterLabel}>Payment</span>
                          <span className={styles.mobileCardFooterValue}>
                            {renderPaymentStatus(String(record.paymentStatus))}
                          </span>
                        </footer>
                      )}
                    </article>
                  );
              })}

              <Pagination
                className={styles.mobilePagination}
                current={currentPage}
                pageSize={pageSize}
                total={dataSource.length}
                showSizeChanger
                pageSizeOptions={["10", "20", "50", "100"]}
                size="small"
                onChange={handlePaginationChange}
                onShowSizeChange={handlePaginationChange}
              />
            </>
          )}
        </div>
      </div>
    );
  }
);

export default BudgetItemsTable;












