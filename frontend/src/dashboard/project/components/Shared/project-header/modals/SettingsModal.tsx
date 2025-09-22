import React from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { Image as ImageIcon, Palette, Pencil, Trash } from "lucide-react";

import Modal from "@/shared/ui/ModalWithStack";

import styles from "@/dashboard/home/components/finish-line-component.module.css";

interface SettingsModalProps {
  isOpen: boolean;
  isAdmin: boolean;
  onEditName: () => void;
  onEditThumbnail: () => void;
  onChangeColor: () => void;
  onEditInvoiceInfo: () => void;
  onDeleteProject: () => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  isAdmin,
  onEditName,
  onEditThumbnail,
  onChangeColor,
  onEditInvoiceInfo,
  onDeleteProject,
  onClose,
}) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
    contentLabel="Project Settings"
    closeTimeoutMS={300}
    className={{
      base: styles.modalContent,
      afterOpen: styles.modalContentAfterOpen,
      beforeClose: styles.modalContentBeforeClose,
    }}
    overlayClassName={styles.modalOverlay}
  >
    <h4 style={{ marginBottom: "20px" }}>Project Settings</h4>

    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <button
        className="modal-button primary"
        aria-label="Edit project name"
        onClick={onEditName}
        style={{ borderRadius: "5px", display: "flex", alignItems: "center", gap: "8px" }}
      >
        <Pencil size={20} color="white" aria-hidden="true" />
        Edit Name
      </button>

      <button
        className="modal-button primary"
        aria-label="Edit project thumbnail"
        onClick={onEditThumbnail}
        style={{ borderRadius: "5px", display: "flex", alignItems: "center", gap: "8px" }}
      >
        <ImageIcon size={20} color="white" aria-hidden="true" />
        Edit Thumbnail
      </button>

      <button
        className="modal-button primary"
        aria-label="Change project color"
        onClick={onChangeColor}
        style={{ borderRadius: "5px", display: "flex", alignItems: "center", gap: "8px" }}
      >
        <Palette size={20} color="white" aria-hidden="true" />
        Change Color
      </button>

      <button
        className="modal-button primary"
        aria-label="Edit invoice info"
        onClick={onEditInvoiceInfo}
        style={{ borderRadius: "5px", display: "flex", alignItems: "center", gap: "8px" }}
      >
        <FontAwesomeIcon icon={faPen} color="white" />
        Invoice Info
      </button>

      {isAdmin && (
        <>
          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", margin: "8px 0" }} />
          <button
            className="modal-button secondary"
            aria-label="Delete project"
            onClick={onDeleteProject}
            style={{
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#1a1a1a",
              border: "1px solid #ffffff",
            }}
          >
            <Trash size={20} color="white" aria-hidden="true" />
            Delete Project
          </button>
        </>
      )}
    </div>
  </Modal>
);

export default SettingsModal;
