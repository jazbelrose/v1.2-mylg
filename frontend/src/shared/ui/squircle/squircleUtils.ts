import { getSquirclePath } from './getSquirclePath';

/**
 * Applies a squircle mask to DOM elements using CSS custom properties
 * This function can be used to enable squircle styling for elements using the .squircle CSS class
 */
export function applySquircleMask(
  element: HTMLElement,
  radius?: number,
  smoothing?: number
): void {
  if (!element || typeof window === 'undefined') return;

  // Check for mask support
  const testEl = document.createElement('div');
  const maskSupported = 'mask' in testEl.style || 'webkitMask' in testEl.style;
  
  if (!maskSupported) return;

  // Get dimensions from the element
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  // Get radius and smoothing from CSS variables or use defaults
  const computedStyle = getComputedStyle(element);
  const cssRadius = computedStyle.getPropertyValue('--shape-radius').trim();
  const cssSmoothing = computedStyle.getPropertyValue('--shape-smoothing').trim();
  
  const finalRadius = radius ?? (cssRadius ? parseFloat(cssRadius) : 20);
  const finalSmoothing = smoothing ?? (cssSmoothing ? parseFloat(cssSmoothing) : 0.6);

  // Generate the squircle path
  const path = getSquirclePath(rect.width, rect.height, finalRadius, finalSmoothing);
  
  // Create the SVG mask URL
  const maskUrl = `url("data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${rect.width} ${rect.height}">
      <path d="${path}" fill="white"/>
    </svg>
  `)}")`;

  // Apply the mask using CSS custom property
  element.style.setProperty('--squircle-mask', maskUrl);
}

/**
 * Sets up automatic squircle masking for elements with the .squircle class
 * Uses ResizeObserver to update masks when elements resize
 */
export function initSquircleObserver(): () => void {
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
    return () => {}; // Return empty cleanup function
  }

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      if (element.classList.contains('squircle')) {
        // Small delay to ensure layout is stable
        requestAnimationFrame(() => {
          applySquircleMask(element);
        });
      }
    }
  });

  // Observe all existing .squircle elements
  const observeSquircles = () => {
    const squircleElements = document.querySelectorAll('.squircle');
    squircleElements.forEach((element) => {
      resizeObserver.observe(element as HTMLElement);
      // Apply initial mask
      applySquircleMask(element as HTMLElement);
    });
  };

  // Initial setup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeSquircles);
  } else {
    observeSquircles();
  }

  // Also observe for new .squircle elements added dynamically
  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.classList?.contains('squircle')) {
              resizeObserver.observe(element);
              applySquircleMask(element);
            }
            // Also check child elements
            const childSquircles = element.querySelectorAll?.('.squircle');
            childSquircles?.forEach((child) => {
              resizeObserver.observe(child as HTMLElement);
              applySquircleMask(child as HTMLElement);
            });
          }
        });
      }
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Return cleanup function
  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
  };
}

/**
 * Utility to manually refresh squircle masks (useful after dynamic styling changes)
 */
export function refreshSquircleMasks(): void {
  if (typeof window === 'undefined') return;
  
  const squircleElements = document.querySelectorAll('.squircle');
  squircleElements.forEach((element) => {
    applySquircleMask(element as HTMLElement);
  });
}