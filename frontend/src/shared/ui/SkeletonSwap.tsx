import React, { ReactNode, useEffect, useRef, useState } from "react";

type SkeletonSwapProps = {
  ready: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  minShowMs?: number;
};

const now = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

const SkeletonSwap: React.FC<SkeletonSwapProps> = ({
  ready,
  skeleton,
  children,
  className = "",
  minShowMs = 300,
}) => {
  const [resolvedReady, setResolvedReady] = useState<boolean>(ready);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(!ready);
  const [showContent, setShowContent] = useState<boolean>(ready);
  const showSinceRef = useRef<number | null>(ready ? null : now());
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setResolvedReady(false);
      setShowContent(false);
      setShowSkeleton(true);
      showSinceRef.current = now();
      return () => {};
    }

    const since = showSinceRef.current;
    if (since == null) {
      setResolvedReady(true);
      setShowSkeleton(false);
      setShowContent(true);
      return () => {};
    }

    const elapsed = now() - since;
    if (elapsed >= minShowMs) {
      setResolvedReady(true);
      setShowSkeleton(false);
      setShowContent(true);
      showSinceRef.current = null;
      return () => {};
    }

    timeoutRef.current = window.setTimeout(() => {
      setResolvedReady(true);
      setShowSkeleton(false);
      setShowContent(true);
      showSinceRef.current = null;
      timeoutRef.current = null;
    }, minShowMs - elapsed);

    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [ready, minShowMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const containerClass = ["skeleton-swap", className].filter(Boolean).join(" ");

  return (
    <div className={containerClass} role="status" aria-busy={!resolvedReady}>
      <div
        className={[
          "skeleton-swap-layer",
          showSkeleton ? "skeleton-visible" : "skeleton-hidden",
        ].join(" ")}
        data-layer="skeleton"
        aria-hidden={!showSkeleton}
      >
        <div style={{ pointerEvents: "none" }}>{skeleton}</div>
      </div>
      <div
        className={[
          "skeleton-swap-layer",
          showContent ? "skeleton-visible" : "skeleton-hidden",
          showContent && resolvedReady ? "" : "disable-interactions",
        ]
          .filter(Boolean)
          .join(" ")}
        data-layer="content"
        aria-hidden={!showContent}
      >
        <div style={{ pointerEvents: resolvedReady ? "auto" : "none" }}>{children}</div>
      </div>
    </div>
  );
};

export default SkeletonSwap;
