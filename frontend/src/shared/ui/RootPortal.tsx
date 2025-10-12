import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
interface RootPortalProps {
  children: React.ReactNode;
  /** Optional custom container; defaults to document.body */
  container?: HTMLElement | null;
}
/**
 * RootPortal
 * SSR-safe portal that mounts children into document.body by default.
 * If running without a DOM (SSR), it renders nothing until mounted.
 */
export const RootPortal: React.FC<RootPortalProps> = ({ children, container }) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document !== "undefined") {
      setTarget(container ?? document.body);
    }
  }, [container]);
  if (!target) return null;
  return createPortal(children, target);
};
export default RootPortal;
