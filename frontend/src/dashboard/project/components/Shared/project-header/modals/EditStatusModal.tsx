import React, { FormEvent } from "react";

import Modal from "@/shared/ui/ModalWithStack";

import styles from "@/dashboard/home/components/finish-line-component.module.css";

interface EditStatusModalProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}

const EditStatusModal: React.FC<EditStatusModalProps> = ({
  isOpen,
  value,
  onChange,
  onSubmit,
  onClose,
}) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
    contentLabel="Edit Status"
    closeTimeoutMS={300}
    className={{
      base: styles.modalContent,
      afterOpen: styles.modalContentAfterOpen,
      beforeClose: styles.modalContentBeforeClose,
    }}
    overlayClassName={styles.modalOverlay}
  >
    <h4 style={{ marginBottom: "20px" }}>Edit Status</h4>
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: "15px" }}>
        <label>Status:</label>
        <input
          className="modal-input"
          style={{
            marginLeft: "10px",
            height: "35px",
            borderRadius: "5px",
            fontSize: "1rem",
          }}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
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

export default EditStatusModal;
