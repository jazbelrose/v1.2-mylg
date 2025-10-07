import React from "react";
import { Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faTrash } from "@fortawesome/free-solid-svg-icons";
import BudgetMobileFilter from "./BudgetMobileFilter";
import styles from "./BudgetToolbar.module.css";

type SortOrder = "ascend" | "descend" | null;

interface BudgetToolbarProps {
  selectedRowKeys: string[];
  handleDuplicateSelected: () => void;
  openDeleteModal: (ids: string[]) => void;
  filterQuery: string;
  onFilterQueryChange: (query: string) => void;
  sortField: string | null;
  sortOrder: SortOrder;
  onSortChange: (field: string | null, order: SortOrder) => void;
}

const BudgetToolbar: React.FC<BudgetToolbarProps> = ({
  selectedRowKeys,
  handleDuplicateSelected,
  openDeleteModal,
  filterQuery,
  onFilterQueryChange,
  sortField,
  sortOrder,
  onSortChange,
}) => (
  <div className={styles.toolbar}>
    <div className={styles.actions}>
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
      </div>
    </div>
  </div>
);

export default BudgetToolbar;








