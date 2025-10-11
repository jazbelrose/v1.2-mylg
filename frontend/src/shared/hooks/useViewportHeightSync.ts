import { useEffect } from "react";

const CSS_VAR_NAME = "--viewport-dvh";
const OVERLAY_SELECTORS = [
  ".overlay",
  ".svg-overlay",
  ".notifications-overlay",
  ".navigation-drawer-backdrop",
  ".preloader-container",
  ".spinner-overlay",
  ".ReactModal__Overlay",
  ".modal",
];

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  const isIOS = /iP(ad|hone|od)/.test(ua);
  const isWebKit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);

  return isIOS && isWebKit && !isChrome && !isFirefox;
}

function applyViewportHeight(fullHeight: number): void {
  const html = document.documentElement;
  const body = document.body;

  const heightValue = `${fullHeight}px`;
  html.style.setProperty(CSS_VAR_NAME, heightValue);
  html.style.height = heightValue;

  body.style.setProperty(CSS_VAR_NAME, heightValue);
  body.style.height = heightValue;

  OVERLAY_SELECTORS.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.style.setProperty(CSS_VAR_NAME, heightValue);
      if (element.style.position === "fixed" || element.style.position === "absolute") {
        element.style.height = heightValue;
      } else {
        element.style.minHeight = heightValue;
      }
    });
  });
}

export function syncViewportHeight(): void {
  if (typeof window === "undefined" || !isIOSSafari()) {
    return;
  }

  const height = Math.max(window.outerHeight || 0, window.innerHeight || 0);
  applyViewportHeight(height);
}

export function useViewportHeightSync(): void {
  useEffect(() => {
    if (!isIOSSafari() || typeof window === "undefined") {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlHeight = html.style.height;
    const previousBodyHeight = body.style.height;
    const previousHtmlVar = html.style.getPropertyValue(CSS_VAR_NAME);
    const previousBodyVar = body.style.getPropertyValue(CSS_VAR_NAME);

    const updateHeight = () => {
      syncViewportHeight();
    };

    updateHeight();

    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);

      html.style.height = previousHtmlHeight;
      body.style.height = previousBodyHeight;

      if (previousHtmlVar) {
        html.style.setProperty(CSS_VAR_NAME, previousHtmlVar);
      } else {
        html.style.removeProperty(CSS_VAR_NAME);
      }

      if (previousBodyVar) {
        body.style.setProperty(CSS_VAR_NAME, previousBodyVar);
      } else {
        body.style.removeProperty(CSS_VAR_NAME);
      }
    };
  }, []);
}

export default useViewportHeightSync;
