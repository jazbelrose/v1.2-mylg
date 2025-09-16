import React from "react";
import NavBadge from "./NavBadge";
import useDashboardNavigation, {
  type DashboardNavItem,
  type UseDashboardNavigationArgs,
} from "./useDashboardNavigation";
import { useAppShell } from "@/app/layout/AppShell";

type DashboardNavPanelProps = UseDashboardNavigationArgs & {
  className?: string;
};

function renderNavItem(item: DashboardNavItem) {
  const hasBadge = typeof item.badgeCount === "number" && item.badgeCount > 0 && item.badgeLabel;
  const inner = (
    <>
      <span className="nav-item-icon" aria-hidden="true">
        {item.icon}
        {hasBadge ? (
          <NavBadge
            count={item.badgeCount ?? 0}
            label={item.badgeLabel ?? "item"}
            className="nav-item-badge"
          />
        ) : null}
      </span>
      <span className="nav-item-label">{item.label}</span>
    </>
  );

  const className = ["nav-item", item.isAction ? "nav-item--action" : null]
    .filter(Boolean)
    .join(" ");

  if (item.href) {
    return (
      <li key={item.key}>
        <a
          className={className}
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          onClick={item.onClick}
        >
          {inner}
        </a>
      </li>
    );
  }

  return (
    <li key={item.key}>
      <button type="button" className={className} onClick={item.onClick}>
        {inner}
      </button>
    </li>
  );
}

const DashboardNavPanel: React.FC<DashboardNavPanelProps> = ({
  setActiveView,
  className,
}) => {
  const appShell = useAppShell();
  const { navItems, bottomItems } = useDashboardNavigation({
    setActiveView,
    onClose: appShell?.closeDrawer,
  });

  const containerClass = [
    "dashboard-nav-panel",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass}>
      <nav className="nav-sections" aria-label="Dashboard">
        <div className="nav-section">
          <ul className="nav-list">{navItems.map((item) => renderNavItem(item))}</ul>
        </div>
        <div className="nav-section nav-section--secondary">
          <ul className="nav-list">{bottomItems.map((item) => renderNavItem(item))}</ul>
        </div>
      </nav>
    </div>
  );
};

export default DashboardNavPanel;
