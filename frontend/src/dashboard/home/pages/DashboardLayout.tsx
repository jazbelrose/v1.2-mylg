import React, { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useData } from "@/app/contexts/useData";
import "./dashboard-styles.css";


const Dashboard: React.FC = () => {
  // If your DataProvider has types, replace `any` below with the real shape.
  const { opacity } = useData() as { opacity?: number };

  const location = useLocation();
  const navigate = useNavigate();
  const hasRestored = useRef<boolean>(false);

  const getPageTitle = (): string => {
    const path = location.pathname;
    if (path.startsWith("/dashboard/projects/")) return "Dashboard - Project Details";
    if (path === "/dashboard" || path === "/dashboard/hq") {
      return "Dashboard - HQ";
    }
    if (path.startsWith("/dashboard/hq/")) {
      return "Dashboard - HQ";
    }
    switch (path) {
      case "/dashboard/new":
        return "Dashboard - Start something";
      case "/dashboard/projects":
        return "Dashboard - Project List";
      case "/dashboard/tasks":
        return "Dashboard - Tasks";
      case "/dashboard/settings":
        return "Dashboard - Settings";
      case "/dashboard/collaborators":
        return "Dashboard - Collaborators";
      default:
        return "Dashboard";
    }
  };

  // Persist last visited dashboard path
  useEffect(() => {
    if (location.pathname.startsWith("/dashboard")) {
      try {
        localStorage.setItem("dashboardLastPath", location.pathname + location.search);
      } catch {
        // ignore storage errors
      }
    }
  }, [location]);

  // Restore last path on first load of /dashboard
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    if (location.pathname === "/dashboard") {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("dashboardLastPath");
      } catch {
        // ignore storage errors
      }

      if (!saved) return;

      let normalized = saved;
      if (normalized === "/hq") {
        normalized = "/dashboard";
      } else if (normalized.startsWith("/hq/")) {
        normalized = normalized.replace("/hq/", "/dashboard/hq/");
      }

      normalized = normalized
        .replace("/dashboard/welcome", "/dashboard/projects")
        .replace("/dashboard/projects-overview", "/dashboard/projects");

      const shouldRedirect =
        normalized !== "/dashboard" &&
        normalized !== "/dashboard/projects" &&
        !normalized.startsWith("/dashboard/hq");

      if (shouldRedirect) {
        navigate(normalized, { replace: true });
      }
    }
  }, [location, navigate]);

  const opacityClass = opacity === 1 ? "opacity-high" : "opacity-low";

  return (
    <>
      <Helmet>
        <meta charSet="utf-8" />
        <title>{getPageTitle()}</title>
        <meta
          name="description"
          content="Manage your projects efficiently with the MYLG dashboard."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className={opacityClass}>
        <Outlet />
      </div>
    </>
  );
};

export default Dashboard;









