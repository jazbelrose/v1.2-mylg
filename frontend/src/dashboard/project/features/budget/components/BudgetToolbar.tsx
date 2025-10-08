import React, { useEffect, useRef } from "react";
import { Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faTrash } from "@fortawesome/free-solid-svg-icons";
import BudgetMobileFilter from "./BudgetMobileFilter";
import styles from "./BudgetToolbar.module.css";

type SortOrder = "ascend" | "descend" | null;

type GroupByOption = "none" | "areaGroup" | "invoiceGroup" | "category";

const GROUP_OPTIONS: { label: string; value: GroupByOption }[] = [
  { label: "None", value: "none" },
  { label: "Area Group", value: "areaGroup" },
  { label: "Invoice Group", value: "invoiceGroup" },
  { label: "Category", value: "category" },
];

interface BudgetToolbarProps {
  selectedRowKeys: string[];
  handleDuplicateSelected: () => void;
  openDeleteModal: (ids: string[]) => void;
  openCreateModal?: () => void;
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
  sortField: string | null;
  sortOrder: SortOrder;
  onSortChange: (field: string | null, order: SortOrder) => void;
  groupBy: GroupByOption;
  onGroupChange: (group: GroupByOption) => void;
  isSelectAllChecked: boolean;
  isSelectAllIndeterminate: boolean;
  onSelectAllChange: (checked: boolean) => void;
  selectionCount: number;
  totalCount: number;
  onClearSelection: () => void;
}

const BudgetToolbar: React.FC<BudgetToolbarProps> = ({
  selectedRowKeys,
  handleDuplicateSelected,
  openDeleteModal,
  openCreateModal,
  filterQuery,
  onFilterQueryChange,
  sortField,
  sortOrder,
  onSortChange,
  groupBy,
  onGroupChange,
  isSelectAllChecked,
  isSelectAllIndeterminate,
  onSelectAllChange,
  selectionCount,
  totalCount,
  onClearSelection,
}) => {
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = isSelectAllIndeterminate;
  }, [isSelectAllIndeterminate]);

  const hasRows = totalCount > 0;

  return (
    <div className={styles.toolbar}>
      <div className={styles.groupControls}>
        <span id="budget-desktop-group-label" className={styles.srOnly}>
          Group budget items
        </span>
        <div
          className={styles.groupTabs}
          role="group"
          aria-labelledby="budget-desktop-group-label"
        >
          {GROUP_OPTIONS.map((option) => {
            const isActive = option.value === groupBy;
            const className = isActive
              ? `${styles.groupTabButton} ${styles.activeGroupTab}`
              : styles.groupTabButton;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                className={className}
                onClick={() => onGroupChange(option.value)}
              >
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className={styles.rightControls}>
        {hasRows && (
          <div className={styles.selectAllBlock}>
            <label className={styles.selectAllControl}>
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={isSelectAllChecked}
                disabled={!hasRows}
                onChange={(event) => onSelectAllChange(event.target.checked)}
                aria-label="Select all budget items"
              />
              <span>Select all</span>
              <span className={styles.selectionCount}>
                {selectionCount}/{totalCount}
              </span>
            </label>
            {selectionCount > 0 && (
              <button
                type="button"
                className={styles.clearSelectionButton}
                onClick={onClearSelection}
              >
                Clear selection
              </button>
            )}
          </div>
        )}
        {selectedRowKeys.length > 0 && (
          <div className={styles.selectionActions}>
            <div className={styles.iconSlot}>
              <AntTooltip title="Duplicate Selected">
                <button
                  type="button"
                  className={styles.iconActionButton}
                  onClick={handleDuplicateSelected}
                  aria-label="Duplicate selected"
                >
                  <FontAwesomeIcon icon={faClone} />
                </button>
              </AntTooltip>
            </div>
            <div className={styles.iconSlot}>
              <AntTooltip title="Delete Selected">
                <button
                  type="button"
                  className={styles.iconActionButton}
                  onClick={() => openDeleteModal(selectedRowKeys)}
                  aria-label="Delete selected"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </AntTooltip>
            </div>
          </div>
        )}
        <div className={styles.mobileFilterWrap}>
          <BudgetMobileFilter
            filterQuery={filterQuery}
            onFilterQueryChange={onFilterQueryChange}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={onSortChange}
          />
        </div>
        {openCreateModal && (
          <button
            type="button"
            className={styles.addButton}
            onClick={openCreateModal}
            aria-label="Add item"
          >
            <span className={styles.addIcon} aria-hidden="true">
              +
            </span>
            <span className={styles.addLabel}>Add Item</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default BudgetToolbar;








