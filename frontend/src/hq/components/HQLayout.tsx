import React, { useEffect, useId, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import DashboardNavPanel from "@/shared/ui/DashboardNavPanel";
import NavigationDrawer from "@/shared/ui/NavigationDrawer";
import { useNavCollapsed } from "@/shared/hooks/useNavCollapsed";
import "@/dashboard/home/pages/dashboard-styles.css";
import styles from "./HQLayout.module.css";

type HQLayoutProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

type ViewportFlags = {
  isDesktop: boolean;
};

function getViewportFlags(): ViewportFlags {
  if (typeof window === "undefined") {
    return { isDesktop: true };
  }

  return { isDesktop: window.innerWidth >= 1024 };
}

const noop = () => {};

const HQLayout: React.FC<HQLayoutProps> = ({
  title,
  description,
  actions,
  children,
}) => {
  const [flags, setFlags] = useState<ViewportFlags>(() => getViewportFlags());
  const [isNavCollapsed, setIsNavCollapsed] = useNavCollapsed("hq");
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const rawDrawerId = useId();
  const drawerId = useMemo(
    () => `hq-nav-${rawDrawerId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawDrawerId]
  );

  useEffect(() => {
    const handleResize = () => setFlags(getViewportFlags());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleOpenNavigation = () => setIsNavigationOpen(true);
  const handleCloseNavigation = () => setIsNavigationOpen(false);
  const handleToggleCollapse = () => setIsNavCollapsed((previous) => !previous);

  const pageHeader = (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeading}>
        {!flags.isDesktop ? (
          <button
            type="button"
            className={styles.menuButton}
            onClick={handleOpenNavigation}
            aria-label="Open navigation"
            aria-controls={drawerId}
            aria-expanded={isNavigationOpen}
          >
            <Menu size={20} />
          </button>
        ) : null}
        <div className={styles.headingCopy}>
          <h1 className={styles.pageTitle}>{title}</h1>
          {description ? (
            <p className={styles.pageSubtitle}>{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className={styles.actionsRow}>{actions}</div> : null}
    </header>
  );

  const mainContent = (
    <main className="dashboard-main">
      <div className={`dashboard-wrapper ${styles.wrapper}`}>
        {pageHeader}
        <div className={styles.content}>{children}</div>
      </div>
    </main>
  );

  if (flags.isDesktop) {
    return (
      <div
        className={`dashboard-root${
          isNavCollapsed ? " dashboard-root--nav-collapsed" : ""
        }`}
      >
        <aside>
          <DashboardNavPanel
            variant="persistent"
            setActiveView={noop}
            isCollapsed={isNavCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </aside>
        {mainContent}
      </div>
    );
  }

  return (
    <>
      <NavigationDrawer
        open={isNavigationOpen}
        onClose={handleCloseNavigation}
        setActiveView={noop}
        drawerId={drawerId}
      />
      {mainContent}
    </>
  );
};

export default HQLayout;
