import React, { useEffect, useMemo, useRef, useState } from "react";

type SkeletonSwapProps = {
  ready: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minShowMs?: number;
};

const DEFAULT_MIN_SHOW = 300;

export default function SkeletonSwap({
  ready,
  skeleton,
  children,
  className = "",
  minShowMs = DEFAULT_MIN_SHOW,
}: SkeletonSwapProps) {
  const [showSkeleton, setShowSkeleton] = useState(!ready);
  const visibleSinceRef = useRef<number | null>(!ready ? Date.now() : null);

  useEffect(() => {
    let timeout: number | undefined;

    if (!ready) {
      visibleSinceRef.current = Date.now();
      setShowSkeleton(true);
      return () => {
        if (timeout) window.clearTimeout(timeout);
      };
    }

    const since = visibleSinceRef.current;
    const elapsed = since ? Date.now() - since : minShowMs;
    const remaining = Math.max(0, minShowMs - elapsed);

    timeout = window.setTimeout(() => {
      setShowSkeleton(false);
      visibleSinceRef.current = null;
    }, remaining);

    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [ready, minShowMs]);

  const containerClassName = useMemo(() => {
    return ["skeleton-swap", className].filter(Boolean).join(" ");
  }, [className]);

  const contentReady = ready && !showSkeleton;

  return (
    <div
      className={containerClassName}
      aria-busy={!contentReady}
      role="status"
    >
      <div
        className="skeleton-layer"
        style={{
          opacity: showSkeleton ? 1 : 0,
          pointerEvents: "none",
        }}
        aria-hidden={contentReady}
      >
        {skeleton}
      </div>
      <div
        className="skeleton-content"
        style={{
          opacity: contentReady ? 1 : 0,
          pointerEvents: contentReady ? undefined : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
