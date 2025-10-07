import React, { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useData } from "@/app/contexts/useData";
import "./dashboard-styles.css";


const Dashboard: React.FC = () => {
  // If your DataProvider has types, replace `any` below with the real shape.
  const { userName, opacity } = useData() as { userName?: string; opacity?: number };

  const location = useLocation();
  const navigate = useNavigate();
  const hasRestored = useRef<boolean>(false);

  const getPageTitle = (): string => {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments[0] !== "dashboard") {
      return "Dashboard";
    }

    const section = segments[1];

    if (!section) {
      return "Dashboard - Home";
    }

    if (section !== "projects") {
      switch (section) {
        case "accounts":
          return "Dashboard - Accounts";
        case "transactions":
          return "Dashboard - Transactions";
        case "reports":
          return "Dashboard - Reports";
        case "invoices":
          return "Dashboard - Invoices";
        case "tasks":
          return "Dashboard - Tasks";
        case "events":
          return "Dashboard - Events";
        case "messages":
          return "Dashboard - Messages";
        default:
          return "Dashboard";
      }
    }

    const projectView = segments[2];

    switch (projectView) {
      case undefined:
        return "Dashboard - Projects";
      case "allprojects":
      case "projects":
        return "Dashboard - Project List";
      case "new":
        return "Dashboard - Start something";
      case "tasks":
        return "Dashboard - Tasks";
      case "notifications":
        return "Dashboard - Notifications";
      case "messages":
        return "Dashboard - Messages";
      case "collaborators":
        return "Dashboard - Collaborators";
      case "settings":
        return "Dashboard - Settings";
      default:
        return "Dashboard - Project Details";
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

      if (saved && saved !== "/dashboard") {
        const normalized = (saved === "/dashboard/projects"
          ? "/dashboard/projects/allprojects"
          : saved)
          .replace("/dashboard/welcome", "/dashboard/projects")
          .replace("/dashboard/projects-overview", "/dashboard/projects")
          .replace("/dashboard/tasks", "/dashboard/projects/tasks")
          .replace("/dashboard/new", "/dashboard/projects/new")
          .replace(
            "/dashboard/projects/projects",
            "/dashboard/projects/allprojects"
          );
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









