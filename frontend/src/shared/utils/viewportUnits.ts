const VIEWPORT_HEIGHT_VAR = '--viewport-height';
const VIEWPORT_WIDTH_VAR = '--viewport-width';
const VIEWPORT_OFFSET_TOP_VAR = '--viewport-offset-top';
const VIEWPORT_OFFSET_LEFT_VAR = '--viewport-offset-left';

const DEFAULT_HEIGHT = '100vh';
const DEFAULT_WIDTH = '100vw';

let rafId: number | null = null;
let initialized = false;

function setViewportUnits() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const docEl = document.documentElement;
  const vv = window.visualViewport;

  const height = vv?.height ?? window.innerHeight;
  const width = vv?.width ?? window.innerWidth;

  docEl.style.setProperty(VIEWPORT_HEIGHT_VAR, `${height}px`);
  docEl.style.setProperty(VIEWPORT_WIDTH_VAR, `${width}px`);
  docEl.style.setProperty(VIEWPORT_OFFSET_TOP_VAR, `${vv?.offsetTop ?? 0}px`);
  docEl.style.setProperty(VIEWPORT_OFFSET_LEFT_VAR, `${vv?.offsetLeft ?? 0}px`);
}

function scheduleUpdate() {
  if (rafId !== null) {
    return;
  }

  rafId = window.requestAnimationFrame(() => {
    rafId = null;
    setViewportUnits();
  });
}

function addEventListeners() {
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('orientationchange', scheduleUpdate, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleUpdate, { passive: true });
    window.visualViewport.addEventListener('scroll', scheduleUpdate, { passive: true });
  }
}

export function initializeViewportUnits(): void {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;

  const docEl = document.documentElement;
  if (!docEl.style.getPropertyValue(VIEWPORT_HEIGHT_VAR)) {
    docEl.style.setProperty(VIEWPORT_HEIGHT_VAR, DEFAULT_HEIGHT);
  }
  if (!docEl.style.getPropertyValue(VIEWPORT_WIDTH_VAR)) {
    docEl.style.setProperty(VIEWPORT_WIDTH_VAR, DEFAULT_WIDTH);
  }
  if (!docEl.style.getPropertyValue(VIEWPORT_OFFSET_TOP_VAR)) {
    docEl.style.setProperty(VIEWPORT_OFFSET_TOP_VAR, '0px');
  }
  if (!docEl.style.getPropertyValue(VIEWPORT_OFFSET_LEFT_VAR)) {
    docEl.style.setProperty(VIEWPORT_OFFSET_LEFT_VAR, '0px');
  }

  setViewportUnits();
  addEventListeners();
}
