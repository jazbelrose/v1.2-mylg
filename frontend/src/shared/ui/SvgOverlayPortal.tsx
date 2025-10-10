import React, { useEffect, useLayoutEffect, useRef } from "react";
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

const NAV_HIDDEN_CLASS = "marketing-nav-hidden";

const activeOverlayTokens = new Set<symbol>();

let pendingVisibilityCheck: number | undefined;

const cancelPendingVisibilityCheck = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (pendingVisibilityCheck !== undefined) {
    window.cancelAnimationFrame(pendingVisibilityCheck);
    pendingVisibilityCheck = undefined;
  }
};

const ensureNavHidden = (body: HTMLElement) => {
  if (!body.classList.contains(NAV_HIDDEN_CLASS)) {
    body.classList.add(NAV_HIDDEN_CLASS);
  }

  cancelPendingVisibilityCheck();
};

const requestNavReveal = (body: HTMLElement) => {
  if (activeOverlayTokens.size > 0) {
    return;
  }

  if (typeof window === "undefined") {
    body.classList.remove(NAV_HIDDEN_CLASS);
    return;
  }

  if (pendingVisibilityCheck !== undefined) {
    return;
  }

  pendingVisibilityCheck = window.requestAnimationFrame(() => {
    pendingVisibilityCheck = undefined;

    if (activeOverlayTokens.size === 0) {
      body.classList.remove(NAV_HIDDEN_CLASS);
    }
  });
};

export const SvgOverlayPortal: React.FC<SvgOverlayPortalProps> = ({
  viewBox = "0 0 1000 1000",
  pathId = "revealPath",
  pathD = "M0,1005S175,995,500,995s500,5,500,5V0H0Z",
  preserveAspectRatio = "none",
  navRevealDelayMs = 1250,
}) => {
  const overlayTokenRef = useRef<symbol>();

  useIsomorphicLayoutEffect(() => {
    if (typeof document === "undefined") {
      return () => undefined;
    }

    const body = document.body;
    const overlayToken = overlayTokenRef.current ?? Symbol("svg-overlay");
    overlayTokenRef.current = overlayToken;

    activeOverlayTokens.add(overlayToken);
    ensureNavHidden(body);

    let revealTimer: number | undefined;
    if (typeof window !== "undefined") {
      revealTimer = window.setTimeout(() => {
        activeOverlayTokens.delete(overlayToken);
        requestNavReveal(body);
      }, navRevealDelayMs);
    }

    return () => {
      if (typeof window !== "undefined" && revealTimer !== undefined) {
        window.clearTimeout(revealTimer);
      }

      activeOverlayTokens.delete(overlayToken);
      requestNavReveal(body);
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
