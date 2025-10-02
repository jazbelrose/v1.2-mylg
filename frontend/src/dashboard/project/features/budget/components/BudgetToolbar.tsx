import React from "react";
import { Segmented, Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faTrash, faUndo, faRedo, faPlus } from "@fortawesome/free-solid-svg-icons";
import styles from "./budget-toolbar.module.css";

interface BudgetToolbarProps {
  groupBy: string;
  onGroupChange: (val: string) => void;
  selectedRowKeys: string[];
  handleDuplicateSelected: () => void;
  openDeleteModal: (ids: string[]) => void;
  undoStackLength: number;
  redoStackLength: number;
  handleUndo: () => void;
  handleRedo: () => void;
  openCreateModal: () => void;
}

const BudgetToolbar: React.FC<BudgetToolbarProps> = ({
  groupBy,
  onGroupChange,
  selectedRowKeys,
  handleDuplicateSelected,
  openDeleteModal,
  undoStackLength,
  redoStackLength,
  handleUndo,
  handleRedo,
  openCreateModal,
}) => (
  <div className={styles.toolbar}>
    <div className={styles.groupControl}>
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
        className={styles.segmentedControl}
      />
    </div>
    <div className={styles.actions}>
      {selectedRowKeys.length > 0 && (
        <div className={styles.selectionActions}>
          <AntTooltip title="Duplicate Selected">
            <button
              type="button"
              className={`modal-button secondary ${styles.actionButton}`}
              onClick={handleDuplicateSelected}
              aria-label="Duplicate selected"
            >
              <FontAwesomeIcon icon={faClone} />
            </button>
          </AntTooltip>
          <AntTooltip title="Delete Selected">
            <button
              type="button"
              className={`modal-button secondary ${styles.actionButton}`}
              onClick={() => openDeleteModal(selectedRowKeys)}
              aria-label="Delete selected"
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </AntTooltip>
        </div>
      )}
      <AntTooltip title="Undo">
        <button
          type="button"
          className={`modal-button secondary ${styles.actionButton}`}
          onClick={handleUndo}
          disabled={undoStackLength === 0}
          aria-label="Undo"
        >
          <FontAwesomeIcon icon={faUndo} />
        </button>
      </AntTooltip>
      <AntTooltip title="Redo">
        <button
          type="button"
          className={`modal-button secondary ${styles.actionButton}`}
          onClick={handleRedo}
          disabled={redoStackLength === 0}
          aria-label="Redo"
        >
          <FontAwesomeIcon icon={faRedo} />
        </button>
      </AntTooltip>
      <AntTooltip title="Create Line Item">
        <button
          type="button"
          className={`modal-button primary ${styles.primaryActionButton}`}
          onClick={openCreateModal}
          aria-label="Create line item"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </AntTooltip>
    </div>
  </div>
);

export default BudgetToolbar;








