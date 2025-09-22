import React from "react";

import { Pipette } from "lucide-react";
import { HexColorInput, HexColorPicker } from "react-colorful";

import Modal from "@/shared/ui/ModalWithStack";

import styles from "@/dashboard/home/components/finish-line-component.module.css";

interface ColorModalProps {
  isOpen: boolean;
  color: string;
  rgbLabel: string;
  onColorChange: (value: string) => void;
  onPickColor: () => void;
  onSave: () => void;
  onClose: () => void;
}

const ColorModal: React.FC<ColorModalProps> = ({
  isOpen,
  color,
  rgbLabel,
  onColorChange,
  onPickColor,
  onSave,
  onClose,
}) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
    contentLabel="Project Color"
    closeTimeoutMS={300}
    className={{
      base: styles.modalContent,
      afterOpen: styles.modalContentAfterOpen,
      beforeClose: styles.modalContentBeforeClose,
    }}
    overlayClassName={styles.modalOverlay}
  >
    <h4 style={{ marginBottom: "20px" }}>Project Color</h4>
    <HexColorPicker color={color} onChange={onColorChange} className={styles.colorPicker} />
    <div className={styles.hexRgbWrapper} style={{ marginTop: "10px" }}>
      <HexColorInput
        color={color}
        onChange={onColorChange}
        prefixed
        style={{
          width: "100px",
          padding: "5px",
          borderRadius: "5px",
          textAlign: "center",
          backgroundColor: "#ffffff",
          color: "#000000",
          border: "1px solid #ccc",
        }}
      />
      <div style={{ marginTop: "5px", fontSize: "0.9rem" }}>RGB: {rgbLabel}</div>
    </div>

    <div className={styles.pipetteWrapper}>
      <Pipette onClick={onPickColor} aria-label="Pick color from screen" style={{ cursor: "pointer", width: 24, height: 24 }} />
    </div>

    <div style={{ display: "flex", justifyContent: "space-around", marginTop: "30px" }}>
      <button className="modal-button primary" onClick={onSave} style={{ padding: "10px 20px", borderRadius: "5px" }}>
        Save
      </button>
      <button className="modal-button secondary" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "5px" }}>
        Cancel
      </button>
    </div>
  </Modal>
);

export default ColorModal;
