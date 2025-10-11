import { useEffect } from 'react';

const FULL_SCREEN_SELECTORS = '.svg-overlay, .preloader-container, .preloaded';

const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
};

const computeFullHeight = (): number => {
  const { innerHeight, outerHeight, screen, visualViewport } = window;
  const viewportHeight = visualViewport ? visualViewport.height + visualViewport.offsetTop : 0;

  const candidates = [
    innerHeight,
    outerHeight,
    screen?.availHeight ?? 0,
    screen?.height ?? 0,
    viewportHeight,
  ].filter((value): value is number => Number.isFinite(value) && value > 0);

  return candidates.length > 0 ? Math.max(...candidates) : innerHeight;
};

export const useLiquidGlassViewportFix = (): void => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const html = document.documentElement;
    const body = document.body;

    const originalHtmlHeight = html.style.height;
    const originalHtmlMinHeight = html.style.minHeight;
    const originalBodyHeight = body.style.height;
    const originalBodyMinHeight = body.style.minHeight;
    const originalBodyOverflowX = body.style.overflowX;
    const originalBodyWidth = body.style.width;

    let orientationTimeout: number | null = null;

    const applyFullHeight = () => {
      const fullHeight = computeFullHeight();

      html.style.height = `${fullHeight}px`;
      html.style.minHeight = `${fullHeight}px`;
      body.style.height = `${fullHeight}px`;
      body.style.minHeight = `${fullHeight}px`;

      const elements = document.querySelectorAll<HTMLElement>(FULL_SCREEN_SELECTORS);

      elements.forEach((element) => {
        element.style.height = `${fullHeight}px`;
        element.style.minHeight = `${fullHeight}px`;
        element.style.top = '0px';
        element.style.left = '0px';
        element.style.width = '100%';
        element.style.transform = 'translateZ(0)';
      });

      if (isIOSDevice()) {
        body.style.overflowX = 'hidden';
        body.style.width = '100%';
      }
    };

    const handleResize = () => {
      applyFullHeight();
    };

    const handleOrientationChange = () => {
      if (orientationTimeout !== null) {
        window.clearTimeout(orientationTimeout);
      }

      orientationTimeout = window.setTimeout(() => {
        applyFullHeight();
      }, 100);
    };

    applyFullHeight();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('load', applyFullHeight);

    const { visualViewport } = window;

    const handleViewportResize = () => {
      applyFullHeight();
    };

    visualViewport?.addEventListener('resize', handleViewportResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('load', applyFullHeight);
      visualViewport?.removeEventListener('resize', handleViewportResize);

      if (orientationTimeout !== null) {
        window.clearTimeout(orientationTimeout);
      }

      html.style.height = originalHtmlHeight;
      html.style.minHeight = originalHtmlMinHeight;
      body.style.height = originalBodyHeight;
      body.style.minHeight = originalBodyMinHeight;
      body.style.overflowX = originalBodyOverflowX;
      body.style.width = originalBodyWidth;
    };
  }, []);
};

export default useLiquidGlassViewportFix;
