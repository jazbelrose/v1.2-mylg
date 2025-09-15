import React, { useRef, useEffect, useState, useMemo, CSSProperties } from 'react';
import { getSquirclePath } from './squircle/getSquirclePath';

export interface SquircleProps {
  /** The element type or component to render (default: 'div') */
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
  /** Corner radius in pixels (default: 20) */
  radius?: number;
  /** Smoothing factor between 0.0 (sharp) and 1.0 (very smooth) (default: 0.6) */
  smoothing?: number;
  /** Additional CSS class name */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Child elements to render inside the squircle */
  children?: React.ReactNode;
  /** Additional props to pass to the underlying element */
  [key: string]: any;
}

/**
 * A reusable wrapper component that clips children to a superellipse (squircle) shape.
 * Uses ResizeObserver to dynamically adjust the mask based on element dimensions.
 * Falls back to border-radius for older browsers or when masking is unsupported.
 */
export const Squircle: React.FC<SquircleProps> = ({
  as: Component = 'div',
  radius = 20,
  smoothing = 0.6,
  className,
  style,
  children,
  ...otherProps
}) => {
  const elementRef = useRef<HTMLElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ 
    width: 0, 
    height: 0 
  });
  const [supportsFeatures, setSupportsFeatures] = useState<{
    mask: boolean;
    resizeObserver: boolean;
  }>({ mask: false, resizeObserver: false });

  // Check for feature support on mount (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkSupport = () => {
      // Check for CSS mask support
      const testElement = document.createElement('div');
      const maskSupported = 
        'mask' in testElement.style || 
        'webkitMask' in testElement.style;

      // Check for ResizeObserver support
      const resizeObserverSupported = typeof ResizeObserver !== 'undefined';

      setSupportsFeatures({
        mask: maskSupported,
        resizeObserver: resizeObserverSupported
      });
    };

    checkSupport();
  }, []);

  // Set up ResizeObserver to track element dimensions
  useEffect(() => {
    if (!supportsFeatures.resizeObserver || !elementRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(elementRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [supportsFeatures.resizeObserver]);

  // Generate SVG mask based on current dimensions
  const maskSvg = useMemo(() => {
    if (!supportsFeatures.mask || dimensions.width <= 0 || dimensions.height <= 0) {
      return null;
    }

    const path = getSquirclePath(dimensions.width, dimensions.height, radius, smoothing);
    
    return `url("data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensions.width} ${dimensions.height}">
        <path d="${path}" fill="white"/>
      </svg>
    `)}")`;
  }, [dimensions.width, dimensions.height, radius, smoothing, supportsFeatures.mask]);

  // Determine styles based on feature support
  const combinedStyle: CSSProperties = useMemo(() => {
    const baseStyle: CSSProperties = {
      ...style,
      // Remove border-radius to avoid double rounding when masking works
      borderRadius: supportsFeatures.mask && maskSvg ? 0 : radius,
    };

    // Apply mask if supported and dimensions are available
    if (supportsFeatures.mask && maskSvg) {
      baseStyle.mask = maskSvg;
      baseStyle.WebkitMask = maskSvg;
      baseStyle.maskSize = 'contain';
      baseStyle.WebkitMaskSize = 'contain';
      baseStyle.maskRepeat = 'no-repeat';
      baseStyle.WebkitMaskRepeat = 'no-repeat';
    }

    return baseStyle;
  }, [style, radius, supportsFeatures.mask, maskSvg]);

  return React.createElement(
    Component,
    {
      ref: elementRef,
      className,
      style: combinedStyle,
      ...otherProps,
    },
    children
  );
};

export default Squircle;