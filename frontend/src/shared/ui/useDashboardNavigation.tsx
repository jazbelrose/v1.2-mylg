import { useCallback, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Folder, Bell, MessageSquare, Settings, LogOut, Shield, Users } from "lucide-react";
import { signOut } from "aws-amplify/auth";
import Cookies from "js-cookie";
import { useAuth } from "@/app/contexts/useAuth";
import { useData } from "@/app/contexts/useData";
import { useNotifications } from "@/app/contexts/useNotifications";
import { GridPlus } from "@/shared/icons/GridPlus";

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

  const handleLogoClick = useCallback(() => {
    navigate("/");
    close();
  }, [navigate, close]);

  const navItems: DashboardNavItem[] = useMemo(
    () => [
      {
        key: "create",
        icon: <GridPlus size={24} color="white" />, // icon colors handled in CSS
        label: "Create New Project",
        onClick: handleCreateProject,
        isAction: true,
      },
      {
        key: "home",
        icon: <Home size={24} color="white" />,
        label: "Home",
        onClick: () => handleNavigation("welcome"),
      },
      {
        key: "projects",
        icon: <Folder size={24} color="white" />,
        label: "Projects",
        onClick: () => handleNavigation("projects"),
      },
      {
        key: "notifications",
        icon: <Bell size={24} color="white" />,
        label: "Notifications",
        onClick: () => handleNavigation("notifications"),
        badgeCount: unreadNotifications,
        badgeLabel: "notification",
      },
      {
        key: "messages",
        icon: <MessageSquare size={24} color="white" />,
        label: "Messages",
        onClick: () => handleNavigation("messages"),
        badgeCount: unreadMessages,
        badgeLabel: "message",
      },
      {
        key: "collaborators",
        icon: <Users size={24} color="white" />,
        label: "Collaborators",
        onClick: () => handleNavigation("collaborators"),
      },
    ],
    [handleCreateProject, handleNavigation, unreadNotifications, unreadMessages]
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
      },
      {
        key: "sign-out",
        icon: <LogOut size={24} color="white" />,
        label: "Sign Out",
        onClick: handleSignOut,
      },
    ],
    [close, handleNavigation, handleSignOut]
  );

  return {
    navItems,
    bottomItems,
    handleLogoClick,
  };
}

export default useDashboardNavigation;
