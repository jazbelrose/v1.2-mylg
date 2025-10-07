import { useCallback, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Folder,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  Shield,
  Users,
  Plus,
} from "lucide-react";
import { signOut } from "aws-amplify/auth";
import Cookies from "js-cookie";
import { useAuth } from "@/app/contexts/useAuth";
import { useData } from "@/app/contexts/useData";
import { useNotifications } from "@/app/contexts/useNotifications";
import {
  PROJECTS_LIST_VIEW,
  PROJECTS_OVERVIEW_VIEW,
  parseDashboardPath,
} from "@/dashboard/home/pages/DashboardHome";

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
  shortLabel?: string;
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

  const isProjectsPath = location.pathname.startsWith("/dashboard/projects");
  const activeDashboardView = useMemo(() => {
    if (!isProjectsPath) return null;
    return parseDashboardPath(location.pathname).view;
  }, [isProjectsPath, location.pathname]);
  const isHQActive =
    location.pathname.startsWith("/dashboard") && !isProjectsPath;

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
      const base = "/dashboard/projects";
      let path: string;
      switch (view) {
        case PROJECTS_OVERVIEW_VIEW:
        case "welcome":
          path = base;
          break;
        case PROJECTS_LIST_VIEW:
        case "projects":
        case "allprojects":
          path = `${base}/allprojects`;
          break;
        default:
          path = `${base}/${view}`;
      }
      navigate(path);
      close();
    },
    [setActiveView, navigate, close]
  );

  const handleCreateProject = useCallback(() => {
    navigate("/dashboard/projects/new");
    close();
  }, [navigate, close]);

  const handleHQNavigation = useCallback(() => {
    navigate("/dashboard");
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
        key: "hq",
        icon: <span className="nav-item__text-icon">HQ</span>,
        label: "Home",
        shortLabel: "HQ",
        onClick: handleHQNavigation,
        isActive: isHQActive,
      },
      {
        key: "home",
        icon: <Folder size={24} color="white" />,
        label: "Projects",
        onClick: () => handleNavigation(PROJECTS_OVERVIEW_VIEW),
        isActive:
          isProjectsPath &&
          (!activeDashboardView ||
            activeDashboardView === PROJECTS_OVERVIEW_VIEW ||
            activeDashboardView === PROJECTS_LIST_VIEW ||
            activeDashboardView === "projects" ||
            activeDashboardView === "allprojects"),
      },
      {
        key: "notifications",
        icon: <Bell size={24} color="white" />,
        label: "Notifications",
        onClick: () => handleNavigation("notifications"),
        badgeCount: unreadNotifications,
        badgeLabel: "notification",
        isActive: isProjectsPath && activeDashboardView === "notifications",
      },
      {
        key: "messages",
        icon: <MessageSquare size={24} color="white" />,
        label: "Messages",
        onClick: () => handleNavigation("messages"),
        badgeCount: unreadMessages,
        badgeLabel: "message",
        isActive: isProjectsPath && activeDashboardView === "messages",
      },
      {
        key: "collaborators",
        icon: <Users size={24} color="white" />,
        label: "Collaborators",
        onClick: () => handleNavigation("collaborators"),
        isActive: isProjectsPath && activeDashboardView === "collaborators",
      },
    ],
    [
      handleCreateProject,
      handleNavigation,
      unreadNotifications,
      unreadMessages,
      isProjectsPath,
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
        isActive: isProjectsPath && activeDashboardView === "settings",
      },
      {
        key: "sign-out",
        icon: <LogOut size={24} color="white" />,
        label: "Sign Out",
        onClick: handleSignOut,
      },
    ],
    [close, handleNavigation, handleSignOut, isProjectsPath, activeDashboardView]
  );

  return {
    navItems,
    bottomItems,
  };
}

export default useDashboardNavigation;









