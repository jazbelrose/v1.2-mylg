import React from "react";
import { X } from "lucide-react";
import { useAppShell } from "@/app/layout/AppShell";
import NavBadge from "./NavBadge";
import useDashboardNavigation, {
  type DashboardNavItem,
  type UseDashboardNavigationArgs,
} from "./useDashboardNavigation";

type DashboardNavPanelProps = UseDashboardNavigationArgs & {
  className?: string;
};

function NavItem({ item }: { item: DashboardNavItem }) {
  const hasBadge =
    typeof item.badgeCount === "number" && item.badgeCount > 0 && item.badgeLabel;
  const itemClass = ["nav-item", item.isAction ? "nav-item--action" : null]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="nav-item-icon" aria-hidden>
        {item.icon}
      </span>
      <span className="nav-item-label">{item.label}</span>
      {hasBadge ? (
        <NavBadge
          count={item.badgeCount ?? 0}
          label={item.badgeLabel ?? "item"}
          className="nav-item-badge"
        />
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <li>
        <a
          className={itemClass}
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noopener noreferrer" : undefined}
          onClick={item.onClick}
        >
          {content}
        </a>
      </li>
    );
  }

  return (
    <li>
      <button type="button" className={itemClass} onClick={item.onClick}>
        {content}
      </button>
    </li>
  );
}

const DashboardNavPanel: React.FC<DashboardNavPanelProps> = ({ setActiveView, onClose, className }) => {
  const appShell = useAppShell();
  const { navItems, bottomItems } = useDashboardNavigation({
    setActiveView,
    onClose: onClose ?? appShell?.closeDrawer,
  });

  const containerClass = ["dashboard-nav-panel", className].filter(Boolean).join(" ");
  const showClose = appShell ? !appShell.isDesktop : false;

  return (
    <nav className={containerClass} aria-label="Primary navigation">
      {showClose ? (
        <button
          type="button"
          className="drawer-close"
          onClick={appShell?.closeDrawer}
          aria-label="Close navigation"
        >
          <X size={18} aria-hidden />
        </button>
      ) : null}

      <div className="drawer-sections">
        <ul className="nav-list">
          {navItems.map((item) => (
            <NavItem key={item.key} item={item} />
          ))}
        </ul>

        <div className="nav-divider" role="presentation" />

        <ul className="nav-list">
          {bottomItems.map((item) => (
            <NavItem key={item.key} item={item} />
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default DashboardNavPanel;
