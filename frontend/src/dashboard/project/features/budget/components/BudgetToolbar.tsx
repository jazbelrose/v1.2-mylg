import React from "react";
import { Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faTrash } from "@fortawesome/free-solid-svg-icons";
import BudgetMobileFilter from "./BudgetMobileFilter";
import styles from "./BudgetToolbar.module.css";

type SortOrder = "ascend" | "descend" | null;

interface BudgetToolbarProps {
  groupBy: string;
  onGroupChange: (val: string) => void;
  selectedRowKeys: string[];
  handleDuplicateSelected: () => void;
  openDeleteModal: (ids: string[]) => void;
  openCreateModal: () => void;
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
  sortField: string | null;
  sortOrder: SortOrder;
  onSortChange: (field: string | null, order: SortOrder) => void;
}

const GROUP_BY_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Area Group", value: "areaGroup" },
  { label: "Invoice Group", value: "invoiceGroup" },
  { label: "Category", value: "category" },
];

const BudgetToolbar: React.FC<BudgetToolbarProps> = ({
  groupBy,
  onGroupChange,
  selectedRowKeys,
  handleDuplicateSelected,
  openDeleteModal,
  openCreateModal,
  filterQuery,
  onFilterQueryChange,
  sortField,
  sortOrder,
  onSortChange,
}) => (
  <div className={styles.toolbar}>
    <div className={styles.groupTabs} role="group" aria-label="Group budget items">
      {GROUP_BY_OPTIONS.map((option) => {
        const isActive = option.value === groupBy;
        const className = isActive
          ? `${styles.tabButton} ${styles.activeTab}`
          : styles.tabButton;
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
    <div className={styles.actions}>
      <div
        className={styles.selectionActions}
        aria-hidden={selectedRowKeys.length === 0 ? "true" : undefined}
      >
        <div className={styles.iconSlot}>
          {selectedRowKeys.length > 0 && (
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
          )}
        </div>
        <div className={styles.iconSlot}>
          {selectedRowKeys.length > 0 && (
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
          )}
        </div>
      </div>
      <div className={styles.mobileRight}>
        <div className={styles.mobileFilterWrap}>
          <BudgetMobileFilter
            filterQuery={filterQuery}
            onFilterQueryChange={onFilterQueryChange}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={onSortChange}
          />
        </div>
        <AntTooltip title="Create Line Item">
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
        </AntTooltip>
      </div>
    </div>
  </div>
);

export default BudgetToolbar;








