import React, { useEffect } from "react";
import { Segmented, Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faTrash, faPlus } from "@fortawesome/free-solid-svg-icons";
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
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (!isMeta) return;

      if (key === "z" && undoStackLength > 0) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (key === "y" && redoStackLength > 0) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleUndo, handleRedo, redoStackLength, undoStackLength]);

  return (
    <div className={styles.container}>
      <Segmented
        size="small"
        className={styles.segmented}
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
                className={styles.iconButton}
                onClick={handleDuplicateSelected}
                aria-label="Duplicate selected"
              >
                <FontAwesomeIcon icon={faClone} />
              </button>
            </AntTooltip>
            <AntTooltip title="Delete Selected">
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => openDeleteModal(selectedRowKeys)}
                aria-label="Delete selected"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </AntTooltip>
          </>
        )}
        <AntTooltip title="Undo (Ctrl+Z)">
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleUndo}
            disabled={undoStackLength === 0}
            aria-label="Undo"
          >
            <span>Undo</span>
            <span className={styles.shortcut}>Ctrl+Z</span>
          </button>
        </AntTooltip>
        <AntTooltip title="Redo (Ctrl+Y)">
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleRedo}
            disabled={redoStackLength === 0}
            aria-label="Redo"
          >
            <span>Redo</span>
            <span className={styles.shortcut}>Ctrl+Y</span>
          </button>
        </AntTooltip>
        <AntTooltip title="Add Line Item">
          <button
            type="button"
            className={styles.addButton}
            onClick={openCreateModal}
            aria-label="Add line item"
          >
            <span className={styles.addIcon}>
              <FontAwesomeIcon icon={faPlus} />
            </span>
            <span>Add Item</span>
          </button>
        </AntTooltip>
      </div>
    </div>
  );
};

export default BudgetToolbar;
