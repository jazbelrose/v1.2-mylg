/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

type AppShellContextValue = {
  isDesktop: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  drawerId: string;
};

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell() {
  return useContext(AppShellContext);
}

type OverlayRenderArgs = {
  open: boolean;
  onClose: () => void;
  drawerId: string;
};

type AppShellProps = PropsWithChildren<{
  drawer?: React.ReactNode;
  renderOverlayDrawer?: (args: OverlayRenderArgs) => React.ReactNode;
  className?: string;
  contentClassName?: string;
}>;

const AppShell: React.FC<AppShellProps> = ({
  drawer,
  renderOverlayDrawer,
  className,
  contentClassName,
  children,
}) => {
  const rawId = useId();
  const drawerId = useMemo(
    () => `app-shell-drawer-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawId]
  );
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(DESKTOP_QUERY).matches;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia(DESKTOP_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setDrawerOpen(false);
      }
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const contextValue = useMemo<AppShellContextValue>(
    () => ({
      isDesktop,
      isDrawerOpen: drawerOpen,
      openDrawer,
      closeDrawer,
      drawerId,
    }),
    [isDesktop, drawerOpen, openDrawer, closeDrawer, drawerId]
  );

  const overlay = !isDesktop && renderOverlayDrawer
    ? renderOverlayDrawer({
        open: drawerOpen,
        onClose: closeDrawer,
        drawerId: `${drawerId}-overlay`,
      })
    : null;

  const rootClass = ["app-shell", className].filter(Boolean).join(" ");
  const mainClass = ["app-shell__main", contentClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className={rootClass} data-desktop={isDesktop}>
        <div className="app-shell__inner">
          <div className={mainClass} data-layout={isDesktop ? "desktop" : "mobile"}>
            <aside
              id={drawerId}
              className="app-shell__drawer app-drawer"
              aria-label="Primary navigation"
              aria-hidden={!isDesktop}
              data-state={isDesktop ? "open" : "closed"}
            >
              {drawer}
            </aside>

            <div className="app-shell__content">{children}</div>
          </div>
        </div>
        {overlay}
      </div>
    </AppShellContext.Provider>
  );
};

export default AppShell;
