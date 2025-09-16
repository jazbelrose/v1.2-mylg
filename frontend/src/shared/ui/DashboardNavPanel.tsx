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
  const className = ["nav-item", item.isAction ? "nav-item--action" : ""]
    .filter(Boolean)
    .join(" ");
  const inner = (
    <>
      <span className="nav-item__icon" aria-hidden>
        {item.icon}
        {hasBadge ? (
          <NavBadge
            count={item.badgeCount ?? 0}
            label={item.badgeLabel ?? "item"}
            className="nav-item__badge"
          />
        ) : null}
      </span>
      <span className="nav-item__label">{item.label}</span>
    </>
  );

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
  onClose,
  variant = "persistent",
  className,
}) => {
  const { navItems, bottomItems } = useDashboardNavigation({ setActiveView, onClose });
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
      {showClose ? (
        <div className="navigation-drawer-header">
          <span className="navigation-drawer-title">Menu</span>
          <button
            type="button"
            className="close-button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={24} color="white" />
          </button>
        </div>
      ) : null}

      <div className="navigation-drawer-content">
        <ul className="nav-list nav-list--primary">
          {navItems.map((item) => renderNavItem(item))}
        </ul>
        <ul className="nav-list nav-list--secondary">
          {bottomItems.map((item) => renderNavItem(item))}
        </ul>
      </div>
    </div>
  );
};

export default DashboardNavPanel;
