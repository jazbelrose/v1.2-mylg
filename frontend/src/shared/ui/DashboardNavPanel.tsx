import React from "react";
import { X } from "lucide-react";
import NavBadge from "./NavBadge";
import useDashboardNavigation, {
  type DashboardNavItem,
  type UseDashboardNavigationArgs,
} from "./useDashboardNavigation";
import "./navigation-drawer.css";

type Variant = "persistent" | "overlay";

type DashboardNavPanelProps = UseDashboardNavigationArgs & {
  variant?: Variant;
  className?: string;
};

function renderNavItem(item: DashboardNavItem) {
  const hasBadge = typeof item.badgeCount === "number" && item.badgeCount > 0 && item.badgeLabel;
  const inner = (
    <>
      <div className="nav-drawer-icon" aria-hidden>
        {item.icon}
        {hasBadge ? (
          <NavBadge
            count={item.badgeCount ?? 0}
            label={item.badgeLabel ?? "item"}
            className="nav-drawer-badge"
          />
        ) : null}
      </div>
      <span className="nav-drawer-label">{item.label}</span>
    </>
  );

  if (item.href) {
    return (
      <a
        key={item.key}
        className={`nav-drawer-item ${item.isAction ? "nav-drawer-action" : ""}`.trim()}
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noopener noreferrer" : undefined}
        onClick={item.onClick}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      key={item.key}
      type="button"
      className={`nav-drawer-item ${item.isAction ? "nav-drawer-action" : ""}`.trim()}
      onClick={item.onClick}
    >
      {inner}
    </button>
  );
}

const DashboardNavPanel: React.FC<DashboardNavPanelProps> = ({
  setActiveView,
  onClose,
  variant = "persistent",
  className,
}) => {
  const { navItems, bottomItems, handleLogoClick } = useDashboardNavigation({ setActiveView, onClose });
  const showClose = variant === "overlay";

  const containerClass = [
    "dashboard-nav-panel",
    `dashboard-nav-panel--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass}>
      <div className="navigation-drawer-header">
        <button
          type="button"
          className="dashboard-nav-panel__logo"
          onClick={handleLogoClick}
          aria-label="Go to Home"
        >
          M!
        </button>
        {showClose && (
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={24} color="white" />
          </button>
        )}
      </div>

      <div className="navigation-drawer-content">
        <div className="navigation-items">
          {navItems.map((item) => renderNavItem(item))}
        </div>
        <div className="navigation-items-bottom">
          {bottomItems.map((item) => renderNavItem(item))}
        </div>
      </div>
    </div>
  );
};

export default DashboardNavPanel;
