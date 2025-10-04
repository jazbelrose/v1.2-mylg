import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/components/ui/utils";

type SkeletonSwapProps = {
  ready: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minShowMs?: number;
};

const DEFAULT_MIN_SHOW = 300;

const SkeletonSwap: React.FC<SkeletonSwapProps> = ({
  ready,
  skeleton,
  children,
  className,
  minShowMs = DEFAULT_MIN_SHOW,
}) => {
  const [isReady, setIsReady] = useState<boolean>(() => ready);
  const skeletonShownAtRef = useRef<number>(ready ? 0 : Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!ready) {
      skeletonShownAtRef.current = Date.now();
      setIsReady(false);
      return undefined;
    }

    const elapsed = Date.now() - skeletonShownAtRef.current;
    if (elapsed >= minShowMs) {
      setIsReady(true);
      return undefined;
    }

    timeoutRef.current = setTimeout(() => {
      setIsReady(true);
      timeoutRef.current = null;
    }, Math.max(0, minShowMs - elapsed));

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [ready, minShowMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isLoading = !isReady;

  return (
    <div
      className={cn(
        "relative grid w-full",
        className,
        isLoading ? "pointer-events-none" : undefined
      )}
      aria-busy={isLoading}
      role="status"
    >
      <div
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-200 ease-in-out",
          isReady ? "opacity-0" : "opacity-100"
        )}
        aria-hidden={isReady || undefined}
      >
        {skeleton}
      </div>
      <div
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-200 ease-in-out",
          isReady ? "opacity-100" : "opacity-0",
          isReady ? undefined : "pointer-events-none"
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default SkeletonSwap;
