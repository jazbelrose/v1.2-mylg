import React, { useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface SvgOverlayPortalProps {
  readonly viewBox?: string;
  readonly pathId?: string;
  readonly pathD?: string;
  readonly preserveAspectRatio?: string;
  readonly navRevealDelayMs?: number;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const SvgOverlayPortal: React.FC<SvgOverlayPortalProps> = ({
  viewBox = "0 0 1000 1000",
  pathId = "revealPath",
  pathD = "M0,1005S175,995,500,995s500,5,500,5V0H0Z",
  preserveAspectRatio = "none",
  navRevealDelayMs = 1250,
}) => {
  useIsomorphicLayoutEffect(() => {
    if (typeof document === "undefined") {
      return () => undefined;
    }

    const body = document.body;
    const navHiddenClass = "marketing-nav-hidden";
    body.classList.add(navHiddenClass);

    let revealTimer: number | undefined;
    if (typeof window !== "undefined") {
      revealTimer = window.setTimeout(() => {
        body.classList.remove(navHiddenClass);
      }, navRevealDelayMs);
    }

    return () => {
      if (typeof window !== "undefined" && revealTimer !== undefined) {
        window.clearTimeout(revealTimer);
      }
      body.classList.remove(navHiddenClass);
    };
  }, [navRevealDelayMs]);

  const overlay = (
    <div className="svg-overlay" aria-hidden="true">
      <svg viewBox={viewBox} preserveAspectRatio={preserveAspectRatio}>
        <path id={pathId} d={pathD} />
      </svg>
    </div>
  );

  if (typeof document === "undefined") {
    return overlay;
  }

  return createPortal(overlay, document.body);
};

export default SvgOverlayPortal;
