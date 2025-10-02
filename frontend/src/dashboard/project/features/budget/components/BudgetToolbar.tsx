import React from "react";
import { Segmented, Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faTrash } from "@fortawesome/free-solid-svg-icons";
import styles from "./BudgetToolbar.module.css";

interface BudgetToolbarProps {
  groupBy: string;
  onGroupChange: (val: string) => void;
  selectedRowKeys: string[];
  handleDuplicateSelected: () => void;
  openDeleteModal: (ids: string[]) => void;
  openCreateModal: () => void;
}

const BudgetToolbar: React.FC<BudgetToolbarProps> = ({
  groupBy,
  onGroupChange,
  selectedRowKeys,
  handleDuplicateSelected,
  openDeleteModal,
  openCreateModal,
}) => (
  <div className={styles.toolbar}>
    <Segmented
      size="small"
      options={[
        { label: "None", value: "none" },
        { label: "Area Group", value: "areaGroup" },
        { label: "Invoice Group", value: "invoiceGroup" },
        { label: "Category", value: "category" },
      ]}
      value={groupBy}
      onChange={(val) => onGroupChange(val as string)}
    />
    <div className={styles.actions}>
      {selectedRowKeys.length > 0 && (
        <>
          <AntTooltip title="Duplicate Selected">
            <button
              type="button"
              className="modal-button secondary"
              style={{ borderRadius: "10px" }}
              onClick={handleDuplicateSelected}
              aria-label="Duplicate selected"
            >
              <FontAwesomeIcon icon={faClone} />
            </button>
          </AntTooltip>
          <AntTooltip title="Delete Selected">
            <button
              type="button"
              className="modal-button secondary"
              style={{ borderRadius: "10px" }}
              onClick={() => openDeleteModal(selectedRowKeys)}
              aria-label="Delete selected"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </AntTooltip>
        </>
      )}
      <AntTooltip title="Create Line Item">
        <button
          type="button"
          className={styles.addButton}
          onClick={openCreateModal}
          aria-label="Add budget line item"
        >
          <span className={styles.addIcon} aria-hidden="true">
            +
          </span>
          <span className={styles.addLabel}>Add Item</span>
        </button>
      </AntTooltip>
    </div>
  </div>
);

export default BudgetToolbar;








