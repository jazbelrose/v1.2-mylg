import React from "react";
import { GalleryVerticalEnd } from "lucide-react";

import styles from "./gallery-component.module.css";
import { getPreviewUrl } from "./GalleryUtils";
import { Gallery } from "./types";
import { getFileUrl } from "../../../../shared/utils/api";

interface GalleryTriggerProps {
  galleries: Gallery[];
  onTriggerClick: () => void;
  onOpenModal: () => void;
}

const GalleryTrigger: React.FC<GalleryTriggerProps> = ({
  galleries,
  onTriggerClick,
  onOpenModal,
}) => {
  return (
    <div
      className={`dashboard-item view-gallery ${styles.galleryTrigger}`}
      onClick={onTriggerClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTriggerClick();
        }
      }}
    >
      <div className={styles.topRow}>
        <GalleryVerticalEnd size={26} className={styles.triggerIcon} />
        <span>Galleries</span>
      </div>

      {galleries.length > 0 && (
        <div
          className={`${styles.thumbnailRow} ${styles.galleryCover}`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenModal();
          }}
          role="button"
          tabIndex={0}
          aria-label="Edit galleries"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onOpenModal();
            }
          }}
        >
          {galleries.map((galleryItem, idx) => {
            const previewUrl = getPreviewUrl(galleryItem);
            return previewUrl ? (
              <img
                src={previewUrl ? getFileUrl(previewUrl) : ""}
                alt=""
                className={styles.previewThumbnail}
                key={galleryItem.slug || idx}
              />
            ) : (
              <div
                className={`${styles.previewThumbnail} ${styles.previewPlaceholder}`}
                key={galleryItem.slug || idx}
              >
                <GalleryVerticalEnd size={32} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GalleryTrigger;
