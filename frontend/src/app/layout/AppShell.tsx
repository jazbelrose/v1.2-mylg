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

const DESKTOP_QUERY = "(min-width: 1280px)";

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

type AppShellProps = PropsWithChildren<{
  drawer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}>;

const AppShell: React.FC<AppShellProps> = ({
  drawer,
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

  const hasDrawer = Boolean(drawer);
  const isNavOpen = hasDrawer && !isDesktop && drawerOpen;
  const rootClass = ["app-shell", className].filter(Boolean).join(" ");
  const bodyClass = [
    "app-body",
    !hasDrawer ? "app-body--no-drawer" : null,
    isNavOpen ? "nav-open" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const mainClass = ["app-content", contentClassName].filter(Boolean).join(" ");
  const drawerState = hasDrawer && (isDesktop || drawerOpen) ? "open" : "closed";
  const drawerHidden = hasDrawer && !isDesktop && !drawerOpen;

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className={rootClass}>
        <div className={bodyClass}>
          {hasDrawer ? (
            <aside
              id={drawerId}
              className="app-drawer"
              aria-label="Primary navigation"
              aria-hidden={drawerHidden}
              data-state={drawerState}
            >
              {drawer}
            </aside>
          ) : null}

          <main className={mainClass}>
            <div className="content-max">{children}</div>
          </main>
        </div>
        {isNavOpen ? (
          <button
            type="button"
            className="app-drawer-backdrop"
            aria-label="Close navigation overlay"
            onClick={closeDrawer}
          />
        ) : null}
      </div>
    </AppShellContext.Provider>
  );
};

export default AppShell;
