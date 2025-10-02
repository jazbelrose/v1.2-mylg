import React, { useEffect, useId, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import DashboardNavPanel from "@/shared/ui/DashboardNavPanel";
import NavigationDrawer from "@/shared/ui/NavigationDrawer";
import { useNavCollapsed } from "@/shared/hooks/useNavCollapsed";
import styles from "./FinanceLayout.module.css";

type FinanceLayoutProps = {
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

const FinanceLayout: React.FC<FinanceLayoutProps> = ({
  title,
  description,
  actions,
  children,
}) => {
  const [flags, setFlags] = useState<ViewportFlags>(() => getViewportFlags());
  const [isNavCollapsed, setIsNavCollapsed] = useNavCollapsed("finance");
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const rawDrawerId = useId();
  const drawerId = useMemo(
    () => `finance-nav-${rawDrawerId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [rawDrawerId]
  );

  useEffect(() => {
    const handleResize = () => setFlags(getViewportFlags());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onToggleNavigation = () => setIsNavigationOpen(true);
  const onCloseNavigation = () => setIsNavigationOpen(false);
  const onToggleCollapse = () => setIsNavCollapsed((prev) => !prev);

  if (flags.isDesktop) {
    return (
      <div className={styles.shell}>
        <aside
          className={`${styles.navArea} ${
            isNavCollapsed ? styles.navAreaCollapsed : ""
          }`.trim()}
        >
          <DashboardNavPanel
            variant="persistent"
            setActiveView={noop}
            isCollapsed={isNavCollapsed}
            onToggleCollapse={onToggleCollapse}
          />
        </aside>
        <div className={styles.mainArea}>
          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{title}</h1>
            {description ? (
              <p className={styles.pageSubtitle}>{description}</p>
            ) : null}
            {actions ? <div className={styles.actionsRow}>{actions}</div> : null}
          </header>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <NavigationDrawer
        open={isNavigationOpen}
        onClose={onCloseNavigation}
        setActiveView={noop}
        drawerId={drawerId}
      />
      <div className={styles.mobileShell}>
        <header className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={onToggleNavigation}
            aria-label="Open navigation"
            aria-controls={drawerId}
            aria-expanded={isNavigationOpen}
          >
            <Menu size={22} />
          </button>
          <h1 className={styles.mobileTitle}>{title}</h1>
        </header>
        {description ? (
          <p className={styles.mobileDescription}>{description}</p>
        ) : null}
        {actions ? <div className={styles.mobileActions}>{actions}</div> : null}
        <div className={styles.mobileContent}>{children}</div>
      </div>
    </>
  );
};

export default FinanceLayout;
