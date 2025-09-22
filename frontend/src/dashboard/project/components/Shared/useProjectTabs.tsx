import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Coins, Calendar as CalendarIcon, PenTool } from "lucide-react";
import { useData } from "@/app/contexts/useData";
import { getProjectDashboardPath } from "@/shared/utils/projectUrl";

export type ProjectTabItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  matches: (pathname: string) => boolean;
};

type UseProjectTabsResult = {
  tabs: ProjectTabItem[];
  storageKey: string;
  getActiveIndex: () => number;
  getFromIndex: () => number;
  confirmNavigate: (path: string) => void;
};

export const useProjectTabs = (
  projectId: string,
  projectTitle?: string | null
): UseProjectTabsResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useData();

  const isAdmin = user?.role === "admin";
  const isDesigner = user?.role === "designer";

  const showBudgetTab = isAdmin;
  const showCalendarTab = isAdmin || isDesigner;
  const showEditorTab = isAdmin || isDesigner;

  const hasProject = Boolean(projectId);

  const basePath = React.useMemo(
    () =>
      hasProject
        ? getProjectDashboardPath(projectId, projectTitle ?? undefined)
        : "/dashboard/projects",
    [hasProject, projectId, projectTitle]
  );

  const budgetPath = React.useMemo(
    () =>
      hasProject
        ? getProjectDashboardPath(
            projectId,
            projectTitle ?? undefined,
            "/budget"
          )
        : "/dashboard/projects",
    [hasProject, projectId, projectTitle]
  );

  const calendarPath = React.useMemo(
    () =>
      hasProject
        ? getProjectDashboardPath(
            projectId,
            projectTitle ?? undefined,
            "/calendar"
          )
        : "/dashboard/projects",
    [hasProject, projectId, projectTitle]
  );

  const editorPath = React.useMemo(
    () =>
      hasProject
        ? getProjectDashboardPath(
            projectId,
            projectTitle ?? undefined,
            "/editor"
          )
        : "/dashboard/projects",
    [hasProject, projectId, projectTitle]
  );

  const tabs = React.useMemo(
    () =>
      [
        {
          key: "overview",
          label: "Overview",
          icon: <LayoutDashboard size={16} />,
          path: basePath,
          visible: true,
          matches: (pathname: string) => pathname === basePath,
        },
        {
          key: "budget",
          label: "Budget",
          icon: <Coins size={16} />,
          path: budgetPath,
          visible: showBudgetTab,
          matches: (pathname: string) => pathname.startsWith(budgetPath),
        },
        {
          key: "calendar",
          label: "Calendar",
          icon: <CalendarIcon size={16} />,
          path: calendarPath,
          visible: showCalendarTab,
          matches: (pathname: string) => pathname.startsWith(calendarPath),
        },
        {
          key: "editor",
          label: "Editor",
          icon: <PenTool size={16} />,
          path: editorPath,
          visible: showEditorTab,
          matches: (pathname: string) => pathname.startsWith(editorPath),
        },
      ].filter((tab) => tab.visible),
    [
      basePath,
      budgetPath,
      calendarPath,
      editorPath,
      showBudgetTab,
      showCalendarTab,
      showEditorTab,
    ]
  );

  const storageKey = React.useMemo(
    () => `project-tabs-prev:${projectId || "unknown"}`,
    [projectId]
  );

  const getActiveIndex = React.useCallback(() => {
    const index = tabs.findIndex((tab) => tab.matches(location.pathname));
    return index === -1 ? 0 : index;
  }, [location.pathname, tabs]);

  const getFromIndex = React.useCallback(() => {
    const locationState = location.state as { fromTab?: number } | undefined;
    if (locationState?.fromTab !== undefined) {
      return locationState.fromTab;
    }

    if (typeof window === "undefined") {
      return getActiveIndex();
    }

    const stored = sessionStorage.getItem(storageKey);
    return stored !== null ? Number(stored) : getActiveIndex();
  }, [location.state, storageKey, getActiveIndex]);

  const confirmNavigate = React.useCallback(
    (path: string) => {
      if (typeof window !== "undefined") {
        const hasUnsaved =
          (typeof window.hasUnsavedChanges === "function" &&
            window.hasUnsavedChanges()) ||
          (window as typeof window & { unsavedChanges?: boolean }).unsavedChanges ===
            true;

        if (hasUnsaved) {
          const proceed = window.confirm("You have unsaved changes, continue?");
          if (!proceed) {
            return;
          }
        }
      }

      navigate(path, { state: { fromTab: getActiveIndex() } });
    },
    [navigate, getActiveIndex]
  );

  return { tabs, storageKey, getActiveIndex, getFromIndex, confirmNavigate };
};
