import React, { FormEvent } from "react";

import Modal from "@/shared/ui/ModalWithStack";

import styles from "@/dashboard/home/components/finish-line-component.module.css";

interface InvoiceInfoModalProps {
  isOpen: boolean;
  invoiceBrandName: string;
  invoiceBrandAddress: string;
  invoiceBrandPhone: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  onChange: (field: string, value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
}

const InvoiceInfoModal: React.FC<InvoiceInfoModalProps> = ({
  isOpen,
  invoiceBrandName,
  invoiceBrandAddress,
  invoiceBrandPhone,
  clientName,
  clientAddress,
  clientPhone,
  clientEmail,
  onChange,
  onSubmit,
  onClose,
}) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
    contentLabel="Invoice Info"
    closeTimeoutMS={300}
    className={{
      base: styles.modalContent,
      afterOpen: styles.modalContentAfterOpen,
      beforeClose: styles.modalContentBeforeClose,
    }}
    overlayClassName={styles.modalOverlay}
  >
    <h4 style={{ marginBottom: "20px" }}>Invoice Info</h4>
    <form onSubmit={onSubmit} className={styles.form}>
      <input
        className="modal-input"
        type="text"
        placeholder="Brand Name"
        value={invoiceBrandName}
        onChange={(event) => onChange("invoiceBrandName", event.target.value)}
        style={{ marginBottom: "10px", borderRadius: "5px" }}
      />
      <input
        className="modal-input"
        type="text"
        placeholder="Brand Address"
        value={invoiceBrandAddress}
        onChange={(event) => onChange("invoiceBrandAddress", event.target.value)}
        style={{ marginBottom: "10px", borderRadius: "5px" }}
      />
      <input
        className="modal-input"
        type="text"
        placeholder="Brand Phone"
        value={invoiceBrandPhone}
        onChange={(event) => onChange("invoiceBrandPhone", event.target.value)}
        style={{ marginBottom: "10px", borderRadius: "5px" }}
      />
      <input
        className="modal-input"
        type="text"
        placeholder="Client Name"
        value={clientName}
        onChange={(event) => onChange("clientName", event.target.value)}
        style={{ marginBottom: "10px", borderRadius: "5px" }}
      />
      <input
        className="modal-input"
        type="text"
        placeholder="Client Address"
        value={clientAddress}
        onChange={(event) => onChange("clientAddress", event.target.value)}
        style={{ marginBottom: "10px", borderRadius: "5px" }}
      />
      <input
        className="modal-input"
        type="text"
        placeholder="Client Phone"
        value={clientPhone}
        onChange={(event) => onChange("clientPhone", event.target.value)}
        style={{ marginBottom: "10px", borderRadius: "5px" }}
      />
      <input
        className="modal-input"
        type="email"
        placeholder="Client Email"
        value={clientEmail}
        onChange={(event) => onChange("clientEmail", event.target.value)}
        style={{ marginBottom: "20px", borderRadius: "5px" }}
      />

      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <button className="modal-button primary" type="submit" style={{ borderRadius: "5px", padding: "10px 20px" }}>
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

export default InvoiceInfoModal;
