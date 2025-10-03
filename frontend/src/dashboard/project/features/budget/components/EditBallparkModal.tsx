import React, { useEffect, useId, useState } from "react";
import Modal from "@/shared/ui/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import styles from "./edit-ball-park-modal.module.css";

if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

type EditBallparkModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (value: number) => void;
  initialValue?: number | string;
};

const EditBallparkModal: React.FC<EditBallparkModalProps> = ({
  isOpen,
  onRequestClose,
  onSubmit,
  initialValue,
}) => {
  const [value, setValue] = useState<string>(
    initialValue !== undefined && initialValue !== null ? String(initialValue) : ""
  );
  const inputId = useId();

  useEffect(() => {
    setValue(
      initialValue !== undefined && initialValue !== null ? String(initialValue) : ""
    );
  }, [initialValue]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const num = parseFloat(value);
    onSubmit(Number.isNaN(num) ? 0 : num);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Edit Ballpark"
      closeTimeoutMS={300}
      className={{
        base: styles.modalContent,
        afterOpen: styles.modalContentAfterOpen,
        beforeClose: styles.modalContentBeforeClose,
      }}
      overlayClassName={{
        base: styles.modalOverlay,
        afterOpen: styles.modalOverlayAfterOpen,
        beforeClose: styles.modalOverlayBeforeClose,
      }}
    >
      <div className={styles.modalHeader}>
        <div className={styles.modalTitle}>Edit Ballpark</div>
        <button
          className={styles.iconButton}
          onClick={onRequestClose}
          aria-label="Close"
          type="button"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldGroup}>
          <label className={styles.inputLabel} htmlFor={inputId}>
            Estimate amount
          </label>
          <div className={styles.currencyInputWrapper}>
            <span className={styles.currencyPrefix} aria-hidden="true">
              $
            </span>
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={styles.input}
              placeholder="0.00"
              autoFocus
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onRequestClose}
          >
            Cancel
          </button>
          <button type="submit" className={styles.primaryButton}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditBallparkModal;









