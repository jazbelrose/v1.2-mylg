import { useEffect } from 'react';

let openCount = 0;
let teardownOverlayHeightFix: (() => void) | null = null;

const OVERLAY_SELECTORS = [
  '.ReactModal__Overlay',
  '.modalOverlay',
  '.modal-overlay',
  '.overlay',
];

function applyOverlayHeightFix(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const html = document.documentElement;
  const body = document.body;
  const previousHtmlHeight = html.style.height;
  const previousHtmlMinHeight = html.style.minHeight;
  const previousBodyHeight = body.style.height;
  const previousBodyMinHeight = body.style.minHeight;

  const updateOverlayHeight = () => {
    const fullHeight = window.outerHeight || window.innerHeight;
    const heightValue = `${fullHeight}px`;

    html.style.height = heightValue;
    html.style.minHeight = heightValue;
    body.style.height = heightValue;
    body.style.minHeight = heightValue;
    html.style.setProperty('--ios-fullscreen-height', heightValue);

    for (const selector of OVERLAY_SELECTORS) {
      document
        .querySelectorAll<HTMLElement>(selector)
        .forEach((element) => {
          element.style.height = heightValue;
          element.style.minHeight = heightValue;
        });
    }
  };

  const scheduleUpdate = () => {
    updateOverlayHeight();
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(updateOverlayHeight);
    }
  };

  scheduleUpdate();

  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('orientationchange', scheduleUpdate);

  return () => {
    window.removeEventListener('resize', scheduleUpdate);
    window.removeEventListener('orientationchange', scheduleUpdate);
    html.style.height = previousHtmlHeight;
    html.style.minHeight = previousHtmlMinHeight;
    body.style.height = previousBodyHeight;
    body.style.minHeight = previousBodyMinHeight;
    html.style.removeProperty('--ios-fullscreen-height');

    for (const selector of OVERLAY_SELECTORS) {
      document
        .querySelectorAll<HTMLElement>(selector)
        .forEach((element) => {
          element.style.height = '';
          element.style.minHeight = '';
        });
    }
  };
}

export default function useModalStack(isOpen: boolean): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isOpen) {
      openCount += 1;
      document.body.classList.add('ReactModal__Body--open');
      if (!teardownOverlayHeightFix) {
        teardownOverlayHeightFix = applyOverlayHeightFix();
      }
    }

    return () => {
      if (isOpen) {
        openCount = Math.max(0, openCount - 1);
        if (openCount === 0) {
          document.body.classList.remove('ReactModal__Body--open');
          if (teardownOverlayHeightFix) {
            teardownOverlayHeightFix();
            teardownOverlayHeightFix = null;
          }
        }
      }
    };
  }, [isOpen]);
}








