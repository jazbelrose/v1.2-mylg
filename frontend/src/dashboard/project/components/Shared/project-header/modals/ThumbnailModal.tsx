import React from "react";

import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import Modal from "@/shared/ui/ModalWithStack";

import styles from "@/dashboard/home/components/finish-line-component.module.css";

interface ThumbnailModalProps {
  isOpen: boolean;
  thumbnailPreview: string | null;
  isDragging: boolean;
  isUploading: boolean;
  crop: { x: number; y: number };
  zoom: number;
  onCropChange: (value: { x: number; y: number }) => void;
  onZoomChange: (value: number) => void;
  onCropComplete: (croppedArea: Area) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onRemoveThumbnail: () => void;
  onUploadThumbnail: () => void;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const ThumbnailModal: React.FC<ThumbnailModalProps> = ({
  isOpen,
  thumbnailPreview,
  isDragging,
  isUploading,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveThumbnail,
  onUploadThumbnail,
  onClose,
  fileInputRef,
}) => (
  <Modal
    isOpen={isOpen}
    onRequestClose={onClose}
    contentLabel="Change Thumbnail"
    closeTimeoutMS={300}
    className={{
      base: styles.modalContent,
      afterOpen: styles.modalContentAfterOpen,
      beforeClose: styles.modalContentBeforeClose,
    }}
    overlayClassName={styles.modalOverlay}
  >
    <h4 style={{ marginBottom: "20px" }}>Choose a Thumbnail</h4>

    <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "20px",
            border: thumbnailPreview ? "none" : `2px dashed ${isDragging ? "#FA3356" : "#ccc"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "#ccc",
            cursor: thumbnailPreview ? "default" : "pointer",
            position: "relative",
          }}
          onClick={!thumbnailPreview ? () => fileInputRef.current?.click() : undefined}
          onDragOver={!thumbnailPreview ? onDragOver : undefined}
          onDragLeave={!thumbnailPreview ? onDragLeave : undefined}
          onDrop={!thumbnailPreview ? onDrop : undefined}
        >
          <input type="file" accept="image/*" ref={fileInputRef} onChange={onFileChange} style={{ display: "none" }} />

          {thumbnailPreview ? (
            <div style={{ position: "relative", width: 150, height: 150 }}>
              <Cropper
                image={thumbnailPreview}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={onCropChange}
                onZoomChange={onZoomChange}
                onCropComplete={(_, cropped) => onCropComplete(cropped)}
                objectFit="cover"
              />
            </div>
          ) : (
            <span style={{ width: "100%" }}>Click or drag thumbnail here</span>
          )}

          {isDragging && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                borderRadius: "20px",
              }}
            >
              Drop to upload
            </div>
          )}

          {isUploading && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "20px",
              }}
            >
              <div className="dot-loader">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        {thumbnailPreview && (
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(event) => onZoomChange(parseFloat(event.target.value))}
            style={{ width: "150px", marginTop: "10px" }}
          />
        )}

        {thumbnailPreview && (
          <button
            className="modal-button secondary"
            type="button"
            onClick={onRemoveThumbnail}
            style={{ marginTop: "10px", borderRadius: "5px", padding: "5px 10px" }}
          >
            Remove
          </button>
        )}
      </div>
    </div>

    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: "30px",
      }}
    >
      <button
        className="modal-button primary"
        type="button"
        onClick={onUploadThumbnail}
        style={{ padding: "10px 20px", borderRadius: "5px" }}
        disabled={!thumbnailPreview || isUploading}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
      <button
        className="modal-button secondary"
        type="button"
        onClick={onClose}
        style={{ padding: "10px 20px", borderRadius: "5px" }}
      >
        Cancel
      </button>
    </div>
  </Modal>
);

export default ThumbnailModal;
