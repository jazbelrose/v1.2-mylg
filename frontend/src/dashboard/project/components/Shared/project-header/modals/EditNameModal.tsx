import React, { FormEvent } from "react";

import Modal from "@/shared/ui/ModalWithStack";

import styles from "@/dashboard/home/components/finish-line-component.module.css";

interface EditNameModalProps {
  isOpen: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}

const EditNameModal: React.FC<EditNameModalProps> = ({
  isOpen,
  value,
  onChange,
  onSubmit,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Edit Project Name"
      closeTimeoutMS={300}
      className={{
        base: styles.modalContent,
        afterOpen: styles.modalContentAfterOpen,
        beforeClose: styles.modalContentBeforeClose,
      }}
      overlayClassName={styles.modalOverlay}
    >
      <h4 style={{ marginBottom: "20px" }}>Edit Project Name</h4>
      <form onSubmit={onSubmit}>
        <input
          className="modal-input"
          style={{
            marginBottom: "25px",
            height: "45px",
            borderRadius: "5px",
            fontSize: "1.2rem",
          }}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
          <button
            className="modal-button primary"
            type="submit"
            style={{ borderRadius: "5px", padding: "10px 40px" }}
          >
            Save
          </button>
          <button
            className="modal-button secondary"
            type="button"
            onClick={onClose}
            style={{ borderRadius: "5px", padding: "10px 40px" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditNameModal;
