import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useData } from "@/app/contexts/useData";
import { useSocket } from "@/app/contexts/useSocket";
import type { Project } from "@/app/contexts/DataProvider";
import { enqueueProjectUpdate } from "@/shared/utils/requestQueue";
import { getProjectDashboardPath } from "@/shared/utils/projectUrl";
import { fileUrlsToKeys } from "@/shared/utils/api";

import { useProjectTabs } from "../../useProjectTabs";
import { useProjectTeamMembers } from "./useProjectTeamMembers";
import { safeParse, toString } from "../utils";

interface UseProjectHeaderBaseParams {
  activeProject: Project | null;
  onActiveProjectChange?: (project: Project) => void;
}

export function useProjectHeaderBase({
  activeProject,
  onActiveProjectChange,
}: UseProjectHeaderBaseParams) {
  const {
    user,
    setActiveProject,
    updateProjectFields,
    isAdmin,
    setProjects,
    setUserProjects,
    refreshUser,
  } = useData();
  const { ws } = useSocket() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId = "" } = useParams<{ projectId: string }>();

  const [saving, setSaving] = useState(false);
  const [localActiveProject, setLocalActiveProject] = useState<Project>(
    activeProject || ({} as Project)
  );

  useEffect(() => {
    const thumbs = fileUrlsToKeys(activeProject?.thumbnails || []);
    setLocalActiveProject(
      activeProject ? { ...activeProject, thumbnails: thumbs } : ({} as Project)
    );
  }, [activeProject]);

  useEffect(() => {
    if (!localActiveProject?.title || !localActiveProject.projectId) return;
    if (!projectId || localActiveProject.projectId !== projectId) return;

    const currentPath = location.pathname.split(/[?#]/)[0];
    const segments = currentPath.split("/").filter(Boolean);
    const projectsIndex = segments.indexOf("projects");

    let suffix = "";
    if (projectsIndex !== -1) {
      const afterProjectId = segments.slice(projectsIndex + 2);
      if (afterProjectId.length > 0) {
        const [firstSegment, ...restSegments] = afterProjectId;
        const expectedSlug = encodeURIComponent(
          (localActiveProject.title ?? "").trim()
        );
        const knownSuffixes = new Set([
          "budget",
          "calendar",
          "moodboard",
          "editor",
        ]);

        let suffixSegments: string[] = [];
        const slugMatchesExpected =
          expectedSlug.length > 0 && firstSegment === expectedSlug;

        if (slugMatchesExpected) {
          suffixSegments = restSegments;
        } else if (knownSuffixes.has(firstSegment.toLowerCase())) {
          suffixSegments = [firstSegment, ...restSegments];
        } else if (restSegments.length > 0) {
          suffixSegments = restSegments;
        }

        if (suffixSegments.length > 0) {
          suffix = `/${suffixSegments.join("/")}`;
        }
      }
    }

    const canonicalPath = getProjectDashboardPath(
      localActiveProject.projectId,
      localActiveProject.title,
      suffix
    );
    if (currentPath === canonicalPath) return;

    navigate(canonicalPath, { replace: true });
  }, [
    localActiveProject?.title,
    localActiveProject?.projectId,
    projectId,
    navigate,
    location.pathname,
  ]);

  const projectInitial =
    localActiveProject?.title && localActiveProject.title.length > 0
      ? localActiveProject.title.charAt(0)
      : "";

  const displayStatus =
    localActiveProject?.status &&
    !localActiveProject.status.toString().trim().endsWith("%")
      ? `${localActiveProject.status}%`
      : (localActiveProject?.status as string) || "0%";

  const startDate = useMemo(
    () =>
      safeParse(
        (localActiveProject?.productionStart as string) ||
          (localActiveProject?.dateCreated as string)
      ),
    [localActiveProject?.productionStart, localActiveProject?.dateCreated]
  );
  const endDate = useMemo(
    () => safeParse(localActiveProject?.finishline as string),
    [localActiveProject?.finishline]
  );

  const totalHoursForProject = useMemo(
    () =>
      (localActiveProject?.timelineEvents || []).reduce(
        (sum, ev) => sum + Number(ev.hours || 0),
        0
      ),
    [localActiveProject?.timelineEvents]
  );

  const rangeLabel = useMemo(() => {
    const totalPart = `Hrs Total: ${totalHoursForProject} hrs`;
    if (!startDate || !endDate) return totalPart;
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = startDate.toLocaleDateString(undefined, opts);
    const endStr = endDate.toLocaleDateString(undefined, opts);
    return `${startStr} – ${endStr} | ${totalPart}`;
  }, [startDate, endDate, totalHoursForProject]);

  const resolvedProjectId =
    (localActiveProject?.projectId as string | undefined) || projectId || "";

  const { tabs, getActiveIndex, confirmNavigate } = useProjectTabs(
    resolvedProjectId,
    localActiveProject?.title
  );

  const activeTabIndex = getActiveIndex();
  const activeTabKey = tabs[activeTabIndex]?.key ?? tabs[0]?.key;

  const mobileRangeLabel = useMemo(() => {
    if (!rangeLabel) return "";
    const parts = rangeLabel.split("|").map((part) => part.trim());
    if (parts.length === 2) {
      const [datesPart, hoursPart] = parts;
      const normalizedHours = hoursPart.replace(/^Hrs Total:\s*/i, "").trim();
      return `${datesPart} · ${normalizedHours}`;
    }
    return rangeLabel.replace(/^Hrs Total:\s*/i, "").trim();
  }, [rangeLabel]);

  const queueUpdate = async (payload: Partial<Project>) => {
    if (!activeProject?.projectId) return;
    try {
      setSaving(true);
      await enqueueProjectUpdate(updateProjectFields, activeProject.projectId, payload);
    } finally {
      setSaving(false);
    }
  };

  const activeProjectId = activeProject?.projectId;
  const teamMembers = useProjectTeamMembers(
    activeProjectId,
    localActiveProject?.team
  );
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  const [invoiceBrandName, setInvoiceBrandName] = useState(
    toString(activeProject?.invoiceBrandName)
  );
  const [invoiceBrandAddress, setInvoiceBrandAddress] = useState(
    toString(activeProject?.invoiceBrandAddress)
  );
  const [invoiceBrandPhone, setInvoiceBrandPhone] = useState(
    toString(activeProject?.invoiceBrandPhone)
  );
  const [clientName, setClientName] = useState(toString(activeProject?.clientName));
  const [clientAddress, setClientAddress] = useState(
    toString(activeProject?.clientAddress)
  );
  const [clientPhone, setClientPhone] = useState(toString(activeProject?.clientPhone));
  const [clientEmail, setClientEmail] = useState(toString(activeProject?.clientEmail));
  const [selectedFinishLineDate, setSelectedFinishLineDate] = useState(
    toString(activeProject?.finishline)
  );
  const [selectedProductionStartDate, setSelectedProductionStartDate] = useState(
    toString(activeProject?.productionStart) || toString(activeProject?.dateCreated)
  );
  const [selectedColor, setSelectedColor] = useState(
    (activeProject?.color as string) || "#FA3356"
  );
  const [updatedName, setUpdatedName] = useState(activeProject?.title || "");
  const [updatedStatus, setUpdatedStatus] = useState(
    activeProject?.status?.toString?.() || ""
  );

  useEffect(() => {
    setUpdatedName(activeProject?.title || "");
    setUpdatedStatus(activeProject?.status?.toString?.() || "");
    setSelectedColor((activeProject?.color as string) || "#FA3356");
    setSelectedFinishLineDate(toString(activeProject?.finishline));
    setSelectedProductionStartDate(
      toString(activeProject?.productionStart) || toString(activeProject?.dateCreated)
    );
    setInvoiceBrandName(toString(activeProject?.invoiceBrandName));
    setInvoiceBrandAddress(toString(activeProject?.invoiceBrandAddress));
    setInvoiceBrandPhone(toString(activeProject?.invoiceBrandPhone));
    setClientName(toString(activeProject?.clientName));
    setClientAddress(toString(activeProject?.clientAddress));
    setClientPhone(toString(activeProject?.clientPhone));
    setClientEmail(toString(activeProject?.clientEmail));
  }, [activeProject]);

  return {
    user,
    ws,
    isAdmin,
    setActiveProject,
    setProjects,
    setUserProjects,
    refreshUser,
    projectId,
    saving,
    queueUpdate,
    localActiveProject,
    setLocalActiveProject,
    projectInitial,
    displayStatus,
    rangeLabel,
    mobileRangeLabel,
    tabs,
    activeTabKey,
    confirmNavigate,
    teamMembers,
    isTeamModalOpen,
    setIsTeamModalOpen,
    invoiceBrandName,
    setInvoiceBrandName,
    invoiceBrandAddress,
    setInvoiceBrandAddress,
    invoiceBrandPhone,
    setInvoiceBrandPhone,
    clientName,
    setClientName,
    clientAddress,
    setClientAddress,
    clientPhone,
    setClientPhone,
    clientEmail,
    setClientEmail,
    selectedFinishLineDate,
    setSelectedFinishLineDate,
    selectedProductionStartDate,
    setSelectedProductionStartDate,
    selectedColor,
    setSelectedColor,
    updatedName,
    setUpdatedName,
    updatedStatus,
    setUpdatedStatus,
    onActiveProjectChange,
  };
}

export type UseProjectHeaderBaseReturn = ReturnType<typeof useProjectHeaderBase>;
