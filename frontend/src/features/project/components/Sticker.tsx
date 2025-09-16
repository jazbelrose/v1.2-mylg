import React, { useMemo } from "react";
import { Link2 } from "lucide-react";
import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
  Transform,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { MoodboardSticker } from "@/app/contexts/DataProvider";
import { getFileUrl } from "@/shared/utils/api";
import styles from "./sticker.module.css";

interface StickerProps {
  sticker: MoodboardSticker;
  transform: Transform | null;
  isDragging?: boolean;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setNodeRef: (node: HTMLElement | null) => void;
  zIndex: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

const Sticker: React.FC<StickerProps> = ({
  sticker,
  transform,
  isDragging = false,
  attributes,
  listeners,
  setNodeRef,
  zIndex,
  onKeyDown,
}) => {
  const translate = CSS.Translate.toString(transform);
  const rotation = Number.isFinite(sticker.rotation) ? sticker.rotation ?? 0 : 0;
  const transformString = useMemo(() => {
    const parts = [] as string[];
    if (translate) parts.push(translate);
    parts.push(`rotate(${rotation}deg)`);
    return parts.join(" ");
  }, [translate, rotation]);

  const imageSrc = useMemo(() => {
    if (!sticker.imageUrl) return undefined;
    try {
      return getFileUrl(sticker.imageUrl);
    } catch {
      return sticker.imageUrl;
    }
  }, [sticker.imageUrl]);

  const computedStyle: React.CSSProperties & Record<string, string | number> = {
    left: sticker.x,
    top: sticker.y,
    zIndex,
    transform: transformString,
    transformOrigin: "center center",
  };

  if (sticker.type === "note") {
    if (sticker.accentColor) {
      computedStyle["--sticker-note-bg"] = sticker.accentColor;
    }
    if (sticker.textColor) {
      computedStyle["--sticker-note-fg"] = sticker.textColor;
    }
  }

  if (sticker.type === "link" && sticker.accentColor) {
    computedStyle.borderColor = sticker.accentColor;
  }

  const className = [
    styles.sticker,
    styles[sticker.type] ?? "",
    isDragging ? styles.dragging : "",
  ]
    .filter(Boolean)
    .join(" ");

  const label = useMemo(() => {
    if (sticker.title) return sticker.title;
    if (sticker.subtitle) return sticker.subtitle;
    if (sticker.body) return sticker.body.slice(0, 80);
    if (sticker.url) return sticker.url;
    return "Moodboard sticker";
  }, [sticker.body, sticker.subtitle, sticker.title, sticker.url]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
  };

  return (
    <div
      ref={setNodeRef}
      className={className}
      style={computedStyle}
      aria-label={label}
      data-type={sticker.type}
      {...attributes}
      onPointerDown={listeners.onPointerDown}
      onKeyDown={handleKeyDown}
    >
      {sticker.type === "note" && (
        <>
          {sticker.subtitle && <span className={styles.meta}>{sticker.subtitle}</span>}
          {sticker.title && <span className={styles.title}>{sticker.title}</span>}
          {sticker.body && <p className={styles.body}>{sticker.body}</p>}
        </>
      )}

      {sticker.type === "photo" && (
        <>
          {sticker.subtitle && <span className={styles.badge}>{sticker.subtitle}</span>}
          {imageSrc && (
            <img
              src={imageSrc}
              alt={sticker.imageAlt || sticker.title || "Moodboard reference"}
              className={styles.photoImage}
              draggable={false}
            />
          )}
          {sticker.title && <span className={styles.title}>{sticker.title}</span>}
          {sticker.body && <p className={styles.photoCaption}>{sticker.body}</p>}
        </>
      )}

      {sticker.type === "link" && (
        <>
          <div className={styles.linkHeader}>
            <span className={styles.badge}>{sticker.subtitle || "Link"}</span>
          </div>
          <a
            href={sticker.url || "#"}
            className={styles.linkAnchor}
            target={sticker.url ? "_blank" : undefined}
            rel={sticker.url ? "noopener noreferrer" : undefined}
            onClick={(event) => {
              if (!sticker.url) {
                event.preventDefault();
              }
            }}
          >
            <Link2 size={16} />
            <span>{sticker.title || sticker.url || "Open resource"}</span>
          </a>
          {sticker.body && <p className={styles.linkMeta}>{sticker.body}</p>}
        </>
      )}
    </div>
  );
};

export default Sticker;
