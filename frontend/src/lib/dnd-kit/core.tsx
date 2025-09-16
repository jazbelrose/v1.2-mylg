/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type UniqueIdentifier = string | number;

export interface Coordinates {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export interface Active {
  id: UniqueIdentifier;
}

export interface DragStartEvent {
  active: Active;
}

export interface DragMoveEvent {
  active: Active;
  delta: Coordinates;
}

export interface DragEndEvent {
  active: Active;
  delta: Coordinates;
}

export interface DragCancelEvent {
  active: Active;
}

interface DragContextValue {
  activeId: UniqueIdentifier | null;
  beginDrag: (id: UniqueIdentifier) => void;
  moveDrag: (id: UniqueIdentifier, delta: Coordinates) => void;
  endDrag: (id: UniqueIdentifier, delta: Coordinates) => void;
  cancelDrag: (id: UniqueIdentifier) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export interface DndContextProps {
  children: React.ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragMove?: (event: DragMoveEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onDragCancel?: (event: DragCancelEvent) => void;
}

export const DndContext: React.FC<DndContextProps> = ({
  children,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const activeRef = useRef<UniqueIdentifier | null>(null);

  const beginDrag = useCallback(
    (id: UniqueIdentifier) => {
      activeRef.current = id;
      setActiveId(id);
      onDragStart?.({ active: { id } });
    },
    [onDragStart]
  );

  const moveDrag = useCallback(
    (id: UniqueIdentifier, delta: Coordinates) => {
      if (activeRef.current !== id) return;
      onDragMove?.({ active: { id }, delta });
    },
    [onDragMove]
  );

  const endDrag = useCallback(
    (id: UniqueIdentifier, delta: Coordinates) => {
      if (activeRef.current !== id) return;
      activeRef.current = null;
      setActiveId(null);
      onDragEnd?.({ active: { id }, delta });
    },
    [onDragEnd]
  );

  const cancelDrag = useCallback(
    (id: UniqueIdentifier) => {
      if (activeRef.current !== id) return;
      activeRef.current = null;
      setActiveId(null);
      onDragCancel?.({ active: { id } });
    },
    [onDragCancel]
  );

  const value = useMemo<DragContextValue>(
    () => ({ activeId, beginDrag, moveDrag, endDrag, cancelDrag }),
    [activeId, beginDrag, moveDrag, endDrag, cancelDrag]
  );

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
};

export interface UseDraggableArguments {
  id: UniqueIdentifier;
  disabled?: boolean;
}

export interface DraggableAttributes {
  role: string;
  tabIndex: number;
  "aria-roledescription": string;
}

export type DraggableSyntheticListeners = Pick<
  React.DOMAttributes<HTMLElement>,
  "onPointerDown"
>;

export interface UseDraggableReturn {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setNodeRef: (node: HTMLElement | null) => void;
  transform: Transform | null;
  isDragging: boolean;
  active: Active | null;
}

type PointerState = {
  pointerId: number;
  cleanup: () => void;
};

export const useDraggable = ({
  id,
  disabled = false,
}: UseDraggableArguments): UseDraggableReturn => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDraggable must be used within a DndContext");
  }

  const nodeRef = useRef<HTMLElement | null>(null);
  const pointerStateRef = useRef<PointerState | null>(null);
  const [transform, setTransform] = useState<Transform | null>(null);

  const cleanupPointerListeners = useCallback(() => {
    const current = pointerStateRef.current;
    if (!current) return;
    current.cleanup();
    pointerStateRef.current = null;
  }, []);

  useEffect(() => () => {
    if (pointerStateRef.current) {
      const pointerId = pointerStateRef.current.pointerId;
      cleanupPointerListeners();
      context.cancelDrag(id);
      if (nodeRef.current) {
        nodeRef.current.releasePointerCapture?.(pointerId);
      }
    }
  }, [cleanupPointerListeners, context, id]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return;
      if (event.button !== undefined && event.button !== 0) return;

      const node = nodeRef.current;
      if (!node) return;

      event.preventDefault();
      try {
        node.focus({ preventScroll: true });
      } catch {
        /* ignore focus errors */
      }

      const pointerId = event.pointerId;
      const originX = event.clientX;
      const originY = event.clientY;
      let deltaX = 0;
      let deltaY = 0;

      function cleanup(): void {
        window.removeEventListener("pointermove", onMove as EventListener);
        window.removeEventListener("pointerup", onUp as EventListener);
        window.removeEventListener("pointercancel", onCancel as EventListener);
        pointerStateRef.current = null;
      }

      function onMove(ev: PointerEvent): void {
        if (ev.pointerId !== pointerId) return;
        ev.preventDefault();
        deltaX = ev.clientX - originX;
        deltaY = ev.clientY - originY;
        setTransform({ x: deltaX, y: deltaY, scaleX: 1, scaleY: 1 });
        context.moveDrag(id, { x: deltaX, y: deltaY });
      }

      function onUp(ev: PointerEvent): void {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        node.releasePointerCapture?.(pointerId);
        setTransform(null);
        context.endDrag(id, { x: deltaX, y: deltaY });
      }

      function onCancel(ev: PointerEvent): void {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        setTransform(null);
        context.cancelDrag(id);
      }

      pointerStateRef.current = { pointerId, cleanup };

      window.addEventListener("pointermove", onMove as EventListener, {
        passive: false,
      });
      window.addEventListener("pointerup", onUp as EventListener);
      window.addEventListener("pointercancel", onCancel as EventListener);

      try {
        node.setPointerCapture?.(pointerId);
      } catch {
        /* ignore pointer capture errors */
      }

      context.beginDrag(id);
      setTransform({ x: 0, y: 0, scaleX: 1, scaleY: 1 });
    },
    [context, disabled, id]
  );

  const setNodeRef = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);

  const listeners = useMemo<DraggableSyntheticListeners>(
    () => ({ onPointerDown: handlePointerDown }),
    [handlePointerDown]
  );

  const attributes = useMemo<DraggableAttributes>(
    () => ({
      role: "button",
      tabIndex: 0,
      "aria-roledescription": "draggable",
    }),
    []
  );

  const isDragging = context.activeId === id;
  const active = isDragging ? { id } : null;

  return {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
    active,
  };
};

export const useDndContext = (): DragContextValue => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error("useDndContext must be used within a DndContext");
  }
  return context;
};

export type KeyboardCoordinateGetter = (
  event: KeyboardEvent,
  context: { currentCoordinates: Coordinates | null }
) => Coordinates | undefined;

export const defaultKeyboardCoordinateGetter: KeyboardCoordinateGetter = () => undefined;
