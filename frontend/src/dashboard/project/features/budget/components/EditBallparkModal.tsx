import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Modal from "@/shared/ui/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import styles from "./edit-ball-park-modal.module.css";

type AccentOverrides = {
  accent?: string;
  accentSoft?: string;
  accentStrong?: string;
  accentBorder?: string;
  accentGlow?: string;
  accentText?: string;
};

const ACCENT_VARIABLE_KEYS = [
  "--edit-ballpark-accent",
  "--edit-ballpark-accent-soft",
  "--edit-ballpark-accent-strong",
  "--edit-ballpark-accent-border",
  "--edit-ballpark-accent-glow",
  "--edit-ballpark-button-text",
] as const;

if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

type EditBallparkModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  onSubmit: (value: number) => void;
  initialValue?: number | string;
  accentColors?: AccentOverrides;
};

const EditBallparkModal: React.FC<EditBallparkModalProps> = ({
  isOpen,
  onRequestClose,
  onSubmit,
  initialValue,
  accentColors,
}) => {
  const [value, setValue] = useState<string>(
    initialValue !== undefined && initialValue !== null ? String(initialValue) : ""
  );
  const inputId = useId();
  const contentNodeRef = useRef<HTMLDivElement | null>(null);

  const accentVariableEntries = useMemo(() => {
    if (!accentColors) {
      return null;
    }

    const entries: Array<[typeof ACCENT_VARIABLE_KEYS[number], string]> = [];

    if (typeof accentColors.accent === "string" && accentColors.accent.trim() !== "") {
      entries.push(["--edit-ballpark-accent", accentColors.accent]);
    }
    if (typeof accentColors.accentSoft === "string" && accentColors.accentSoft.trim() !== "") {
      entries.push(["--edit-ballpark-accent-soft", accentColors.accentSoft]);
    }
    if (typeof accentColors.accentStrong === "string" && accentColors.accentStrong.trim() !== "") {
      entries.push(["--edit-ballpark-accent-strong", accentColors.accentStrong]);
    }
    if (typeof accentColors.accentBorder === "string" && accentColors.accentBorder.trim() !== "") {
      entries.push(["--edit-ballpark-accent-border", accentColors.accentBorder]);
    }
    if (typeof accentColors.accentGlow === "string" && accentColors.accentGlow.trim() !== "") {
      entries.push(["--edit-ballpark-accent-glow", accentColors.accentGlow]);
    }
    if (typeof accentColors.accentText === "string" && accentColors.accentText.trim() !== "") {
      entries.push(["--edit-ballpark-button-text", accentColors.accentText]);
    }

    return entries.length > 0 ? entries : null;
  }, [accentColors]);

  const applyAccentVariables = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) {
        return;
      }

      ACCENT_VARIABLE_KEYS.forEach((key) => {
        node.style.removeProperty(key);
      });

      accentVariableEntries?.forEach(([key, value]) => {
        node.style.setProperty(key, value);
      });
    },
    [accentVariableEntries]
  );

  const handleContentRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentNodeRef.current = node;
      if (node) {
        applyAccentVariables(node);
      }
    },
    [applyAccentVariables]
  );

  useEffect(() => {
    setValue(
      initialValue !== undefined && initialValue !== null ? String(initialValue) : ""
    );
  }, [initialValue]);

  useEffect(() => {
    if (!contentNodeRef.current) {
      return;
    }
    applyAccentVariables(contentNodeRef.current);
  }, [applyAccentVariables]);

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
      contentRef={handleContentRef}
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









