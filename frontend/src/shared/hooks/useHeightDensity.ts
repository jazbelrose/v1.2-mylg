import { useEffect } from "react";

export type HeightDensity = "comfy" | "cozy" | "compact";

const getDensity = (height: number): HeightDensity => {
  if (height <= 760) {
    return "compact";
  }
  if (height <= 900) {
    return "cozy";
  }
  return "comfy";
};

/**
 * Sets a `data-h-density` attribute on the root element so CSS can respond
 * to viewport height changes without relying on JS-driven layout logic.
 */
export const useHeightDensity = (): void => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    if (!root) return;

    const update = () => {
      const density = getDensity(window.innerHeight);
      root.dataset.hDensity = density;
    };

    update();
    window.addEventListener("resize", update, { passive: true });

    return () => {
      window.removeEventListener("resize", update);
      delete root.dataset.hDensity;
    };
  }, []);
};

export default useHeightDensity;
