import React from "react";
import { GalleryVerticalEnd } from "lucide-react";

import styles from "./gallery-component.module.css";
import { getPreviewUrl } from "./GalleryUtils";
import { Gallery } from "./types";
import { getFileUrl } from "../../../../shared/utils/api";

interface GalleryTriggerProps {
  galleries: Gallery[];
  onOpenModal: () => void;
}

const GalleryTrigger: React.FC<GalleryTriggerProps> = ({
  galleries,
  onOpenModal,
}) => {
  const hasGalleries = galleries.length > 0;
  const visibleCount = Math.min(3, galleries.length);
  const visibleGalleries = galleries.slice(0, visibleCount);
  const hiddenCount = galleries.length - visibleCount;

  return (
    <div
      className={`dashboard-item view-gallery ${styles.galleryTrigger}`}
      onClick={onOpenModal}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenModal();
        }
      }}
    >
      {/* Two equal columns: title (left) and thumbnails (right) */}
      <div className={styles.titleColumn}>
        <div className={styles.topRow}>
          <span>Galleries</span>
         
        </div>
        {hasGalleries ? (
          <p className={styles.galleryHelperText}>
            Peek at the latest uploads or jump into the full gallery.
          </p>
        ) : (
          <p className={styles.galleryHelperText}>Create your first gallery to showcase work.</p>
        )}
      </div>

      <div className={styles.thumbsColumn}>
        {hasGalleries ? (
          <div className={styles.carouselSection}>
            <div className={styles.thumbnailCarousel} aria-label="Gallery previews">
              {visibleGalleries.map((galleryItem, idx) => {
                const previewUrl = getPreviewUrl(galleryItem);
                return (
                  <div className={styles.thumbnailTile} key={galleryItem.slug || idx}>
                    {previewUrl ? (
                      <img src={getFileUrl(previewUrl)} alt={galleryItem.name || "Gallery preview"} />
                    ) : (
                      <div className={styles.thumbnailPlaceholder}>
                        <GalleryVerticalEnd size={28} />
                      </div>
                    )}
                  </div>
                );
              })}
              {hiddenCount > 0 && (
                <div className={`${styles.thumbnailTile} ${styles.moreTile}`}>+{hiddenCount}</div>
              )}
            </div>
            {/* Entire container navigates to the galleries list; individual button removed */}
          </div>
        ) : (
          <div className={styles.emptyState}>No galleries yet</div>
        )}
      </div>
    </div>
  );
};

export default GalleryTrigger;
