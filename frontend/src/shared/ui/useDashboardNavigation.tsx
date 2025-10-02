import { useCallback, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Folder,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  Users,
  Plus,
  Banknote,
} from "lucide-react";
import { signOut } from "aws-amplify/auth";
import Cookies from "js-cookie";
import { useAuth } from "@/app/contexts/useAuth";
import { useData } from "@/app/contexts/useData";
import { useNotifications } from "@/app/contexts/useNotifications";
import { parseDashboardPath } from "@/dashboard/home/pages/DashboardHome";

export type DashboardNavItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  isAction?: boolean;
  badgeCount?: number;
  badgeLabel?: string;
  isActive?: boolean;
};

export type UseDashboardNavigationArgs = {
  setActiveView: (view: string) => void;
  onClose?: () => void;
};

export function useDashboardNavigation({ setActiveView, onClose }: UseDashboardNavigationArgs) {
  const { setIsAuthenticated, setCognitoUser } = useAuth();
  const { inbox } = useData();
  const { notifications } = useNotifications() as { notifications: Array<{ read?: boolean }> };
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboardPath = location.pathname.startsWith("/dashboard");
  const activeDashboardView = useMemo(() => {
    if (!isDashboardPath) return null;
    return parseDashboardPath(location.pathname).view;
  }, [isDashboardPath, location.pathname]);
  const isHQActive = location.pathname.startsWith("/hq");

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const unreadMessages = useMemo(
    () => inbox.filter((t) => t.read === false).length,
    [inbox]
  );

  const close = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  const handleNavigation = useCallback(
    (view: string) => {
      setActiveView(view);
      const base = "/dashboard";
      const path = view === "welcome" ? base : `${base}/${view}`;
      navigate(path);
      close();
    },
    [setActiveView, navigate, close]
  );

  const handleCreateProject = useCallback(() => {
    navigate("/dashboard/new");
    close();
  }, [navigate, close]);

  const handleHQNavigation = useCallback(() => {
    navigate("/hq");
    close();
  }, [navigate, close]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setCognitoUser(null);
      navigate("/login");
      Cookies.remove("myCookie");
      close();
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  }, [setIsAuthenticated, setCognitoUser, navigate, close]);

  const navItems: DashboardNavItem[] = useMemo(
    () => [
      {
        key: "create",
        icon: <Plus size={24} color="white" />, // icon colors handled in CSS
        label: "Start something",
        onClick: handleCreateProject,
        isAction: true,
      },
      {
        key: "home",
        icon: <Home size={24} color="white" />,
        label: "Home",
        onClick: () => handleNavigation("welcome"),
        isActive:
          (isDashboardPath && (!activeDashboardView || activeDashboardView === "welcome")) ||
          location.pathname === "/dashboard",
      },
      {
        key: "projects",
        icon: <Folder size={24} color="white" />,
        label: "Projects",
        onClick: () => handleNavigation("projects"),
        isActive: isDashboardPath && activeDashboardView === "projects",
      },
      {
        key: "hq",
        icon: <Banknote size={24} color="white" />,
        label: "HQ",
        onClick: handleHQNavigation,
        isActive: isHQActive,
      },
      {
        key: "notifications",
        icon: <Bell size={24} color="white" />,
        label: "Notifications",
        onClick: () => handleNavigation("notifications"),
        badgeCount: unreadNotifications,
        badgeLabel: "notification",
        isActive: isDashboardPath && activeDashboardView === "notifications",
      },
      {
        key: "messages",
        icon: <MessageSquare size={24} color="white" />,
        label: "Messages",
        onClick: () => handleNavigation("messages"),
        badgeCount: unreadMessages,
        badgeLabel: "message",
        isActive: isDashboardPath && activeDashboardView === "messages",
      },
      {
        key: "collaborators",
        icon: <Users size={24} color="white" />,
        label: "Collaborators",
        onClick: () => handleNavigation("collaborators"),
        isActive: isDashboardPath && activeDashboardView === "collaborators",
      },
    ],
    [
      handleCreateProject,
      handleNavigation,
      unreadNotifications,
      unreadMessages,
      isDashboardPath,
      activeDashboardView,
      location.pathname,
      handleHQNavigation,
      isHQActive,
    ]
  );

  const bottomItems: DashboardNavItem[] = useMemo(
    () => [
      {
        key: "terms",
        icon: <Shield size={24} color="white" />,
        label: "Terms & Privacy",
        href: "/terms-and-privacy",
        external: true,
        onClick: close,
      },
      {
        key: "settings",
        icon: <Settings size={24} color="white" />,
        label: "Settings",
        onClick: () => handleNavigation("settings"),
        isActive: isDashboardPath && activeDashboardView === "settings",
      },
      {
        key: "sign-out",
        icon: <LogOut size={24} color="white" />,
        label: "Sign Out",
        onClick: handleSignOut,
      },
    ],
    [close, handleNavigation, handleSignOut, isDashboardPath, activeDashboardView]
  );

  return {
    navItems,
    bottomItems,
  };
}

export default useDashboardNavigation;









