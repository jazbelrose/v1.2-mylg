import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import StickerCard from "./StickerCard";
import QuickInsertPalette from "./QuickInsertPalette";
import { useMoodboardStore } from "../hooks/useMoodboardStore";
import type { Sticker, StickerDraft } from "../types";
import styles from "../moodboard.module.css";

const GRID_STEP = 8;

export interface MoodboardCanvasProps {
  projectId?: string;
  userId?: string;
}

type DragState = {
  id: string;
  pointerStart: { x: number; y: number };
  stickerStart: { x: number; y: number };
};

const MoodboardCanvas: React.FC<MoodboardCanvasProps> = ({ projectId, userId }) => {
  const { stickers, addSticker, updateSticker, removeSticker, bringToFront, clear } =
    useMoodboardStore({ projectId, userId });
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const selectedSticker = useMemo<Sticker | null>(() => {
    if (!selectedId) return null;
    return stickers.find((item) => item.id === selectedId) ?? null;
  }, [selectedId, stickers]);

  const cleanupDrag = useCallback(() => {
    setDragState(null);
    setDragOffset(null);
  }, []);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      setDragOffset({
        x: event.clientX - dragState.pointerStart.x,
        y: event.clientY - dragState.pointerStart.y,
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const deltaX = event.clientX - dragState.pointerStart.x;
      const deltaY = event.clientY - dragState.pointerStart.y;
      const nextX = dragState.stickerStart.x + deltaX;
      const nextY = dragState.stickerStart.y + deltaY;
      updateSticker(dragState.id, {
        x: nextX,
        y: nextY,
      });
      cleanupDrag();
    };

    const handlePointerCancel = () => {
      cleanupDrag();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    window.addEventListener("pointercancel", handlePointerCancel, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [cleanupDrag, dragState, updateSticker]);

  const handleStickerPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, id: string) => {
      event.preventDefault();
      event.stopPropagation();
      const sticker = stickers.find((item) => item.id === id);
      if (!sticker) return;
      bringToFront(id);
      setSelectedId(id);
      setDragState({
        id,
        pointerStart: { x: event.clientX, y: event.clientY },
        stickerStart: { x: sticker.x, y: sticker.y },
      });
      setDragOffset({ x: 0, y: 0 });
    },
    [bringToFront, stickers]
  );

  const handleBoardPointerDown = useCallback(() => {
    setSelectedId(null);
    boardRef.current?.focus();
  }, []);

  const handleBoardKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (paletteOpen) {
        if (event.key === "Escape") {
          setPaletteOpen(false);
        }
        return;
      }

      if (event.key === "+" || event.key === "=" || event.key === "/") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (!selectedSticker) return;

      const step = event.shiftKey ? GRID_STEP * 3 : GRID_STEP;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        updateSticker(selectedSticker.id, { y: selectedSticker.y - step });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        updateSticker(selectedSticker.id, { y: selectedSticker.y + step });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateSticker(selectedSticker.id, { x: selectedSticker.x - step });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        updateSticker(selectedSticker.id, { x: selectedSticker.x + step });
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSticker(selectedSticker.id);
        setSelectedId(null);
      }
    },
    [paletteOpen, removeSticker, selectedSticker, updateSticker]
  );

  const focusBoard = useCallback(() => {
    boardRef.current?.focus();
  }, []);

  useEffect(() => {
    focusBoard();
  }, [focusBoard]);

  const handleAddSticker = useCallback(
    (draft: StickerDraft) => {
      const rect = boardRef.current?.getBoundingClientRect();
      const basePosition = rect
        ? {
            x: rect.width / 2 - 80,
            y: rect.height / 2 - 80,
          }
        : { x: 64, y: 64 };
      const created = addSticker(draft, basePosition);
      if (created) {
        setSelectedId(created.id);
        bringToFront(created.id);
        setTimeout(focusBoard, 0);
      }
    },
    [addSticker, bringToFront, focusBoard]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedSticker) return;
    removeSticker(selectedSticker.id);
    setSelectedId(null);
    focusBoard();
  }, [focusBoard, removeSticker, selectedSticker]);

  const showEmptyState = stickers.length === 0;

  return (
    <div className={styles.moodboardPage}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarButtons}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setPaletteOpen(true)}
          >
            <Plus size={16} />
            Add sticker
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => {
              setPaletteOpen(true);
            }}
            aria-label="Open quick insert"
          >
            <span style={{ fontWeight: 700, fontSize: "1rem" }}>/</span>
            Quick insert
          </button>
        </div>

        <div className={styles.keyboardHint}>
          <span>
            <kbd>/</kbd> Quick insert
          </span>
          <span>
            <kbd>+</kbd> Add
          </span>
          <span>
            <kbd>↑↓←→</kbd> Nudge
          </span>
        </div>

        <div className={styles.toolbarButtons}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleDeleteSelected}
            disabled={!selectedSticker}
          >
            <Trash2 size={16} />
            Remove
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => {
              clear();
              setSelectedId(null);
              focusBoard();
            }}
            disabled={!stickers.length}
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </div>

      <div className={styles.canvasWrapper}>
        <div
          ref={boardRef}
          className={styles.canvas}
          tabIndex={0}
          role="application"
          aria-label="Moodboard canvas"
          onPointerDown={handleBoardPointerDown}
          onKeyDown={handleBoardKeyDown}
        >
          {showEmptyState && (
            <div className={styles.emptyState}>
              Press <kbd>+</kbd> or <kbd>/</kbd> to drop your first sticker.
            </div>
          )}

          {stickers.map((sticker) => (
            <StickerCard
              key={sticker.id}
              sticker={sticker}
              isSelected={selectedId === sticker.id}
              isActiveDrag={dragState?.id === sticker.id}
              offset={dragState?.id === sticker.id ? dragOffset : null}
              onPointerDown={handleStickerPointerDown}
              onFocus={setSelectedId}
              onRemove={removeSticker}
            />
          ))}
        </div>
      </div>

      <QuickInsertPalette
        open={paletteOpen}
        onClose={() => {
          setPaletteOpen(false);
          focusBoard();
        }}
        onSubmit={(draft) => {
          handleAddSticker(draft);
        }}
      />
    </div>
  );
};

export default MoodboardCanvas;
