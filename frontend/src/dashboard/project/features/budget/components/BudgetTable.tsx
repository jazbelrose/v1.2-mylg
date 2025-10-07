import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pagination } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faClock, faTrash } from "@fortawesome/free-solid-svg-icons";
import styles from "@/dashboard/project/features/budget/pages/budget-page.module.css";
import { formatUSD } from "@/shared/utils/budgetUtils";

const MOBILE_BREAKPOINT = 768;

const PAGINATION_ESTIMATE = 96;

type BudgetItem = Record<string, unknown> & {
  budgetItemId: string;
  key: string;
};

interface BudgetItemsTableProps {
  dataSource: BudgetItem[];
  selectedRowKeys: string[];
  setSelectedRowKeys: (keys: string[] | ((prev: string[]) => string[])) => void;
  lockedLines: string[];
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
    selectedRowKeys,
    setSelectedRowKeys,
    lockedLines,
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
    const [isMobile, setIsMobile] = useState(false);
    const selectAllRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
      const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
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

    const availableIds = useMemo(
      () => dataSource.map((item) => String(item.budgetItemId)),
      [dataSource]
    );

    const availableIdSet = useMemo(() => new Set(availableIds), [availableIds]);

    const selectedInScope = useMemo(
      () => selectedRowKeys.filter((id) => availableIdSet.has(id)),
      [selectedRowKeys, availableIdSet]
    );

    const isSelectAllChecked =
      availableIds.length > 0 && selectedInScope.length === availableIds.length;

    const isSelectAllIndeterminate =
      selectedInScope.length > 0 && selectedInScope.length < availableIds.length;

    useEffect(() => {
      if (!selectAllRef.current) return;
      selectAllRef.current.indeterminate = isSelectAllIndeterminate;
    }, [isSelectAllIndeterminate]);

    const handleSelectAllChange = useCallback(
      (checked: boolean) => {
        setSelectedRowKeys((prevKeys) => {
          if (checked) {
            const next = new Set(prevKeys);
            availableIds.forEach((id) => next.add(id));
            return Array.from(next);
          }
          return prevKeys.filter((id) => !availableIdSet.has(id));
        });
      },
      [availableIds, availableIdSet, setSelectedRowKeys]
    );

    const handleClearSelection = useCallback(() => {
      setSelectedRowKeys((prevKeys) => prevKeys.filter((id) => !availableIdSet.has(id)));
    }, [availableIdSet, setSelectedRowKeys]);

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

    useEffect(() => {
      const totalItems = dataSource.length;
      const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);
      if (currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    }, [currentPage, dataSource.length, pageSize, setCurrentPage]);

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

    const listStyle = useMemo(() => {
      if (!tableHeight) return undefined;
      const minHeight = Math.max(0, tableHeight - PAGINATION_ESTIMATE);
      return { minHeight };
    }, [tableHeight]);

    return (
      <div ref={tableRef} className={styles.tableContainer}>
        {dataSource.length > 0 && (
          <div className={styles.cardListHeader}>
            <label className={styles.selectAllControl}>
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={isSelectAllChecked}
                onChange={(event) => handleSelectAllChange(event.target.checked)}
                aria-label="Select all budget items"
              />
              <span>Select all</span>
              <span className={styles.selectionCount}>
                {selectedInScope.length}/{availableIds.length}
              </span>
            </label>
            {selectedInScope.length > 0 && (
              <button
                type="button"
                className={styles.clearSelectionButton}
                onClick={handleClearSelection}
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        <div className={styles.cardListWrapper} style={listStyle}>
          {paginatedData.length === 0 ? (
            <div className={styles.emptyPlaceholder}>No budget items to display</div>
          ) : (
            <div className={`${styles.cardList}${isMobile ? ` ${styles.cardListMobile}` : ""}`}>
              {paginatedData.map((record) => {
                const isSelected = selectedRowKeys.includes(record.budgetItemId);
                const isLocked = lockedLines.includes(record.budgetItemId);
                const events = eventsByLineItem[record.budgetItemId] || [];
                const eventCount = events.length;

                return (
                  <article
                    key={record.key}
                    className={`${styles.card}${
                      isSelected ? ` ${styles.cardSelected}` : ""
                    }${isLocked ? ` ${styles.cardLocked}` : ""}`}
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
                    <header className={styles.cardHeader}>
                      <div className={styles.cardHeaderLeft}>
                        <label className={styles.cardCheckbox}>
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
                        <div className={styles.cardIdentifiers}>
                          <span className={styles.cardKey}>
                            {String(record.elementKey ?? "—")}
                          </span>
                          {record.elementId && (
                            <span className={styles.cardId}>
                              {String(record.elementId)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.cardControls}>
                        <button
                          className={styles.cardIconButton}
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
                            <span className={styles.cardEventBadge}>{eventCount}</span>
                          )}
                        </button>
                        <button
                          className={styles.cardIconButton}
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
                          className={styles.cardIconButton}
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

                    <div className={styles.cardDescription}>
                      {record.description ? String(record.description) : "No description"}
                    </div>

                    <div className={styles.cardMetrics}>
                      {mobileMetrics.map((metric) => (
                        <div key={metric.key} className={styles.cardMetric}>
                          <span className={styles.cardMetricLabel}>{metric.label}</span>
                          <span className={styles.cardMetricValue}>
                            {formatMetricValue(record, metric.key)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {record.paymentStatus && (
                      <footer className={styles.cardFooter}>
                        <span className={styles.cardFooterLabel}>Payment</span>
                        <span className={styles.cardFooterValue}>
                          {renderPaymentStatus(String(record.paymentStatus))}
                        </span>
                      </footer>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {dataSource.length > 0 && (
          <Pagination
            className={styles.cardPagination}
            current={currentPage}
            pageSize={pageSize}
            total={dataSource.length}
            showSizeChanger
            pageSizeOptions={["10", "20", "50", "100"]}
            size="small"
            onChange={handlePaginationChange}
            onShowSizeChange={handlePaginationChange}
          />
        )}
      </div>
    );
  }
);

export default BudgetItemsTable;
