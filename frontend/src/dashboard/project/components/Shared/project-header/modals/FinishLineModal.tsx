import React, { FormEvent } from "react";

import Modal from "@/shared/ui/ModalWithStack";

import styles from "@/dashboard/home/components/finish-line-component.module.css";

interface FinishLineModalProps {
  isOpen: boolean;
  productionStartDate: string;
  finishLineDate: string;
  onProductionStartChange: (value: string) => void;
  onFinishLineChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}

const FinishLineModal: React.FC<FinishLineModalProps> = ({
  isOpen,
  productionStartDate,
  finishLineDate,
  onProductionStartChange,
  onFinishLineChange,
  onSubmit,
  onClose,
}) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
    contentLabel="Finish Line"
    closeTimeoutMS={300}
    className={{
      base: styles.modalContent,
      afterOpen: styles.modalContentAfterOpen,
      beforeClose: styles.modalContentBeforeClose,
    }}
    overlayClassName={styles.modalOverlay}
  >
    <h4 style={{ marginBottom: "20px" }}>Production Start & Finish Line</h4>
    <form onSubmit={onSubmit} className={styles.form}>
      <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        Production Start
        <input
          type="date"
          aria-label="Production start date"
          value={productionStartDate}
          onChange={(event) => onProductionStartChange(event.target.value)}
          className={styles.input}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        Finish Line
        <input
          type="date"
          aria-label="Finish line date"
          value={finishLineDate}
          onChange={(event) => onFinishLineChange(event.target.value)}
          className={styles.input}
        />
      </label>
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <button
          className="modal-button primary"
          type="submit"
          style={{ borderRadius: "5px", padding: "10px 20px" }}
        >
          Save
        </button>
        <button
          className="modal-button secondary"
          type="button"
          onClick={onClose}
          style={{ borderRadius: "5px", padding: "10px 20px" }}
        >
          Cancel
        </button>
      </div>
    </form>
  </Modal>
);

export default FinishLineModal;
