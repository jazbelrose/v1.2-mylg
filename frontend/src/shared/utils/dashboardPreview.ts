import { useEffect, useState } from "react";

const STORAGE_KEY = "mylg.dashboardPreview";
const DISABLE_VALUES = new Set(["0", "false", "off", "no", "disable", "disabled", "none"]);
const ENABLE_VALUES = new Set(["", "1", "true", "on", "yes", "enable", "enabled", "dashboard"]);

function shouldUsePreview(search: string): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(search);

  const explicitDashboardPreview = params.has("dashboardPreview")
    ? parsePreviewParam(params.get("dashboardPreview"))
    : null;

  const previewParam = params.has("preview")
    ? parseAliasParam(params.get("preview"))
    : null;

  const explicit = explicitDashboardPreview ?? previewParam;

  if (explicit !== null) {
    persistPreviewChoice(explicit);
    return explicit;
  }

  return readStoredPreview();
}

function parsePreviewParam(raw: string | null): boolean {
  if (raw == null) {
    return true;
  }
  const value = raw.trim().toLowerCase();
  if (DISABLE_VALUES.has(value)) {
    return false;
  }
  if (ENABLE_VALUES.has(value)) {
    return true;
  }
  return true;
}

function parseAliasParam(raw: string | null): boolean | null {
  if (raw == null) {
    return null;
  }
  const value = raw.trim().toLowerCase();
  if (value === "dashboard") {
    return true;
  }
  if (DISABLE_VALUES.has(value)) {
    return false;
  }
  if (ENABLE_VALUES.has(value)) {
    return true;
  }
  return null;
}

function persistPreviewChoice(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (enabled) {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Unable to persist dashboard preview flag", error);
    }
  }
}

function readStoredPreview(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useDashboardPreview(search: string): boolean {
  const [enabled, setEnabled] = useState(() => shouldUsePreview(search));

  useEffect(() => {
    setEnabled(shouldUsePreview(search));
  }, [search]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (enabled) {
      document.body.dataset.dashboardPreview = "true";
    } else {
      delete document.body.dataset.dashboardPreview;
    }
  }, [enabled]);

  return enabled;
}

export function isDashboardPreviewEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return shouldUsePreview(window.location.search);
}
