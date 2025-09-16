import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
  useDraggable,
  type Coordinates,
} from "@dnd-kit/core";
import type { MoodboardSticker } from "@/app/contexts/DataProvider";
import { useData } from "@/app/contexts/useData";
import { enqueueProjectUpdate } from "@/shared/utils/requestQueue";
import Sticker from "./Sticker";
import styles from "./sticker-board.module.css";

const GRID_SIZE = 8;
const MIN_ROTATION = 1;
const MAX_ROTATION = 2;

const snapToGrid = (value: number): number =>
  Math.round(value / GRID_SIZE) * GRID_SIZE;

const randomRotation = (): number => {
  const magnitude = MIN_ROTATION + Math.random() * (MAX_ROTATION - MIN_ROTATION);
  const sign = Math.random() > 0.5 ? 1 : -1;
  return Number((magnitude * sign).toFixed(2));
};

const sanitizeSticker = (sticker: MoodboardSticker): MoodboardSticker => ({
  ...sticker,
  x: Math.round(sticker.x),
  y: Math.round(sticker.y),
  rotation:
    sticker.rotation === undefined || Number.isNaN(sticker.rotation)
      ? randomRotation()
      : Number(sticker.rotation.toFixed(2)),
});

const sanitizeStickers = (items: MoodboardSticker[]): MoodboardSticker[] =>
  items.map(sanitizeSticker);

const buildDefaultStickers = (project: Project | null): MoodboardSticker[] => {
  const quickLink = Array.isArray(project?.quickLinks)
    ? project?.quickLinks?.find((link) => Boolean(link?.url))
    : undefined;
  const thumbnail = Array.isArray(project?.thumbnails)
    ? project?.thumbnails.find((item) => typeof item === "string" && item.length > 0)
    : undefined;

  const description = (project?.description || "")
    .replace(/\s+/g, " ")
    .trim();
  const truncatedDescription = description
    ? `${description.slice(0, 170)}${description.length > 170 ? "…" : ""}`
    : "Collect palette notes, adjectives and inspo cues so every collaborator stays on the same wavelength.";

  const defaults: MoodboardSticker[] = [
    {
      id: "mood-note",
      type: "note",
      subtitle: "Creative North Star",
      title: project?.title ? `${project.title} direction` : "Creative direction",
      body: truncatedDescription,
      accentColor: "#fef3c7",
      textColor: "#2b1708",
      x: 40,
      y: 48,
    },
    {
      id: "mood-photo",
      type: "photo",
      subtitle: "Visual Ref",
      title: project?.title ? `${project.title} hero` : "Hero reference",
      body: project?.clientName
        ? `Client: ${project.clientName}`
        : "Drop renders, swatches or lighting tests here.",
      imageUrl: thumbnail ?? "/images/Og.png",
      imageAlt: project?.title ? `${project.title} mood reference` : "Moodboard reference",
      x: 224,
      y: 200,
    },
    {
      id: "mood-link",
      type: "link",
      subtitle: "Reference",
      title: quickLink?.title || "Deck & shared inspiration",
      url: quickLink?.url || "https://mylg.studio",
      body: quickLink?.url || "Add the working deck, Notion hub or Pinterest link.",
      accentColor: "#89c7ff",
      x: 360,
      y: 64,
    },
  ];

  return defaults;
};

const normalizeStickers = (
  items: MoodboardSticker[]
): { stickers: MoodboardSticker[]; changed: boolean } => {
  const seen = new Set<string>();
  let changed = false;
  const normalized: MoodboardSticker[] = [];

  items.forEach((item, index) => {
    if (!item || typeof item.id !== "string" || seen.has(item.id)) {
      return;
    }
    seen.add(item.id);

    const baseX = Number.isFinite(item.x) ? Number(item.x) : 56 + index * 96;
    const baseY = Number.isFinite(item.y) ? Number(item.y) : 72 + index * 112;
    const x = snapToGrid(baseX);
    const y = snapToGrid(baseY);
    const rotation =
      typeof item.rotation === "number" && !Number.isNaN(item.rotation)
        ? Number(item.rotation.toFixed(2))
        : randomRotation();

    if (x !== item.x || y !== item.y || rotation !== item.rotation) {
      changed = true;
    }

    normalized.push({ ...item, x, y, rotation });
  });

  return { stickers: normalized, changed };
};

type DraggableStickerProps = {
  sticker: MoodboardSticker;
  isActive: boolean;
  index: number;
  onKeyboardNudge: (id: string, delta: Coordinates) => void;
};

const DraggableSticker: React.FC<DraggableStickerProps> = ({
  sticker,
  isActive,
  index,
  onKeyboardNudge,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: sticker.id,
  });

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;
      let delta: Coordinates | null = null;
      switch (event.key) {
        case "ArrowUp":
          delta = { x: 0, y: -GRID_SIZE };
          break;
        case "ArrowDown":
          delta = { x: 0, y: GRID_SIZE };
          break;
        case "ArrowLeft":
          delta = { x: -GRID_SIZE, y: 0 };
          break;
        case "ArrowRight":
          delta = { x: GRID_SIZE, y: 0 };
          break;
        default:
          break;
      }
      if (!delta) return;
      event.preventDefault();
      onKeyboardNudge(sticker.id, delta);
    },
    [onKeyboardNudge, sticker.id]
  );

  const zIndex = isDragging ? 120 + index : isActive ? 90 + index : 50 + index;

  return (
    <Sticker
      sticker={sticker}
      transform={transform}
      isDragging={isDragging || isActive}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      zIndex={zIndex}
      onKeyDown={handleKeyDown}
    />
  );
};

const StickerBoard: React.FC = () => {
  const { activeProject, updateProjectFields } = useData();
  const projectId = activeProject?.projectId ?? null;
  const [stickers, setStickers] = useState<MoodboardSticker[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastPersistedRef = useRef<string>("");

  const persistStickers = useCallback(
    (next: MoodboardSticker[]) => {
      if (!projectId || !updateProjectFields) return;
      const sanitized = sanitizeStickers(next);
      const serialized = JSON.stringify(sanitized);
      if (lastPersistedRef.current === serialized) return;
      lastPersistedRef.current = serialized;
      void enqueueProjectUpdate(updateProjectFields, projectId, {
        moodboardStickers: sanitized,
      });
    },
    [projectId, updateProjectFields]
  );

  useEffect(() => {
    if (!activeProject || !projectId) {
      setStickers([]);
      lastPersistedRef.current = "";
      return;
    }

    const stored = Array.isArray(activeProject.moodboardStickers)
      ? (activeProject.moodboardStickers as MoodboardSticker[])
      : [];
    const seed = stored.length ? stored : buildDefaultStickers(activeProject);
    const { stickers: normalized, changed } = normalizeStickers(seed);
    setStickers(normalized);

    const serialized = JSON.stringify(sanitizeStickers(normalized));
    lastPersistedRef.current = serialized;

    if ((changed || stored.length === 0) && projectId && updateProjectFields) {
      void enqueueProjectUpdate(updateProjectFields, projectId, {
        moodboardStickers: sanitizeStickers(normalized),
      });
    }
  }, [activeProject, projectId, updateProjectFields]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    if (event?.active?.id) {
      setActiveId(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const id = String(event.active.id);
      setActiveId(null);
      const delta = event.delta;
      if (!delta || (!delta.x && !delta.y)) return;

      let updated: MoodboardSticker[] | null = null;
      setStickers((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        if (index === -1) return prev;
        const current = prev[index];
        const nextX = snapToGrid(current.x + delta.x);
        const nextY = snapToGrid(current.y + delta.y);
        if (nextX === current.x && nextY === current.y) return prev;
        const next = [...prev];
        next[index] = { ...current, x: nextX, y: nextY };
        updated = next;
        return next;
      });

      if (updated) {
        persistStickers(updated);
      }
    },
    [persistStickers]
  );

  const handleKeyboardNudge = useCallback(
    (id: string, delta: Coordinates) => {
      let updated: MoodboardSticker[] | null = null;
      setActiveId(id);
      setStickers((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        if (index === -1) return prev;
        const current = prev[index];
        const nextX = snapToGrid(current.x + delta.x);
        const nextY = snapToGrid(current.y + delta.y);
        if (nextX === current.x && nextY === current.y) return prev;
        const next = [...prev];
        next[index] = { ...current, x: nextX, y: nextY };
        updated = next;
        return next;
      });
      if (updated) {
        persistStickers(updated);
      }
    },
    [persistStickers]
  );

  const hasStickers = stickers.length > 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.legend}>Moodboard Stickers</span>
          <h3 className={styles.title}>Project Atmosphere</h3>
          <p className={styles.subtitle}>
            Drop visual cues, notes, and quick links. Everything snaps to the grid so the
            board stays effortlessly tidy.
          </p>
        </div>
        <div className={styles.board}>
          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className={styles.canvas}>
              {hasStickers ? null : (
                <div className={styles.emptyState}>
                  Start by adding a note, photo, or link to set the tone for your team.
                </div>
              )}
              {stickers.map((sticker, index) => (
                <DraggableSticker
                  key={sticker.id}
                  sticker={sticker}
                  index={index}
                  isActive={activeId === sticker.id}
                  onKeyboardNudge={handleKeyboardNudge}
                />
              ))}
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
};

export default StickerBoard;
