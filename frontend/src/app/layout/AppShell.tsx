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

  useEffect(() => {
    if (!drawerOpen || isDesktop) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, isDesktop, closeDrawer]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!isDesktop && drawerOpen) {
      const { overflow } = document.body.style;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = overflow;
      };
    }

    return undefined;
  }, [drawerOpen, isDesktop]);

  const rootClass = ["app-shell", className].filter(Boolean).join(" ");
  const bodyClass = [
    "app-body",
    !isDesktop && drawerOpen ? "nav-open" : null,
  ]
    .filter(Boolean)
    .join(" ");
  const mainClass = ["app-content", contentClassName].filter(Boolean).join(" ");
  const showScrim = !isDesktop && drawerOpen;

  return (
    <AppShellContext.Provider value={contextValue}>
      <div className={rootClass} data-nav-open={showScrim ? "true" : "false"}>
        <div className={bodyClass}>
          <aside
            id={drawerId}
            className="app-drawer"
            aria-label="Primary navigation"
            aria-hidden={!isDesktop && !drawerOpen}
            data-state={isDesktop || drawerOpen ? "open" : "closed"}
          >
            {drawer}
          </aside>

          <main className={mainClass}>
            <div className="content-max">{children}</div>
          </main>
        </div>
        {showScrim ? (
          <button
            type="button"
            className="app-drawer-scrim"
            aria-label="Close navigation"
            onClick={closeDrawer}
          />
        ) : null}
      </div>
    </AppShellContext.Provider>
  );
};

export default AppShell;
