import React from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import NavBadge from "./NavBadge";
import Squircle from "./Squircle";
import useDashboardNavigation, {
  type DashboardNavItem,
  type UseDashboardNavigationArgs,
} from "./useDashboardNavigation";
import "./navigation-drawer.css";

const PANEL_RADIUS = 24;
const PANEL_CORNER_RADII = Object.freeze({ top: PANEL_RADIUS + 2, bottom: PANEL_RADIUS - 2 });

type Variant = "persistent" | "overlay";

type DashboardNavPanelProps = UseDashboardNavigationArgs & {
  variant?: Variant;
  className?: string;
};

function renderNavItem(item: DashboardNavItem) {
  const hasBadge = typeof item.badgeCount === "number" && item.badgeCount > 0 && item.badgeLabel;
  const keyClass = item.key ? `nav-item--${item.key}` : "";
  const className = ["nav-item", keyClass, item.isAction ? "nav-item--action" : ""]
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
  const isOverlay = variant === "overlay";
  const isPersistent = variant === "persistent";

  const containerClass = [
    "dashboard-nav-panel",
    `dashboard-nav-panel--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass}>
      {isOverlay ? (
        <div className="navigation-drawer-header navigation-drawer-header--overlay">
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

      <Squircle
        as="div"
        className="navigation-drawer-content"
        radius={PANEL_RADIUS}
        smoothing={0.6}
        cornerRadii={PANEL_CORNER_RADII}
      >
        {isPersistent ? (
          <div className="dashboard-nav-panel__brand-row">
            <Link
              to="/"
              className="dashboard-nav-panel__brand-button"
              aria-label="Go to marketing home"
            >
              <span className="dashboard-nav-panel__brand-mark">M!</span>
              <span className="dashboard-nav-panel__brand-text">MYLG</span>
            </Link>
          </div>
        ) : null}

        <ul className="nav-list nav-list--primary">
          {navItems.map((item) => renderNavItem(item))}
        </ul>
        <ul className="nav-list nav-list--secondary">
          {bottomItems.map((item) => renderNavItem(item))}
        </ul>
      </Squircle>
    </div>
  );
};

export default DashboardNavPanel;
