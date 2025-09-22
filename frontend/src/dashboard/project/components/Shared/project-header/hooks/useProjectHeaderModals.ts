import { useState } from "react";

import type { Project } from "@/app/contexts/DataProvider";
import { POST_PROJECT_TO_USER_URL, apiFetch } from "@/shared/utils/api";

import type { UseProjectHeaderBaseReturn } from "./useProjectHeaderBase";
import { toString } from "../utils";
import { useThumbnailManager } from "./useThumbnailManager";

interface UseProjectHeaderModalsParams {
  activeProject: Project | null;
  base: UseProjectHeaderBaseReturn;
  showWelcomeScreen: () => void;
  onProjectDeleted: (projectId: string) => void;
  userId: string;
}

export function useProjectHeaderModals({
  activeProject,
  base,
  showWelcomeScreen,
  onProjectDeleted,
  userId,
}: UseProjectHeaderModalsParams) {
  const {
    user,
    ws,
    setActiveProject,
    setProjects,
    setUserProjects,
    refreshUser,
    queueUpdate,
    localActiveProject,
    setLocalActiveProject,
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
    invoiceBrandName,
    invoiceBrandAddress,
    invoiceBrandPhone,
    clientName,
    clientAddress,
    clientPhone,
    clientEmail,
    onActiveProjectChange,
  } = base;

  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [isFinishLineModalOpen, setIsFinishLineModalOpen] = useState(false);
  const [isInvoiceInfoModalOpen, setIsInvoiceInfoModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState(false);
  const [returnToSettings, setReturnToSettings] = useState(false);
  const {
    state: thumbnailState,
    inputRef: thumbnailInputRef,
    setCrop: setThumbnailCrop,
    setZoom: setThumbnailZoom,
    setCroppedArea: setThumbnailCroppedArea,
    handleFileChange: handleThumbnailFileChange,
    handleDragOver: handleThumbDragOver,
    handleDragLeave: handleThumbDragLeave,
    handleDrop: handleThumbDrop,
    reset: resetThumbnail,
    uploadThumbnail,
  } = useThumbnailManager({
    activeProject,
    localActiveProject,
    setLocalActiveProject,
    onActiveProjectChange,
    setActiveProject,
    queueUpdate,
    ws,
    user,
  });

  const openFromSettings = (setter: (value: boolean) => void) => {
    setReturnToSettings(true);
    setter(true);
  };

  const closeWithReturn = (setter: (value: boolean) => void) => {
    setter(false);
    if (returnToSettings) {
      setIsSettingsModalOpen(true);
      setReturnToSettings(false);
    }
  };

  const openEditNameModal = (fromSettings = false) => {
    if (fromSettings) {
      openFromSettings(setIsEditNameModalOpen);
    } else {
      setReturnToSettings(false);
      setIsEditNameModalOpen(true);
    }
    setUpdatedName(localActiveProject.title || "");
  };

  const closeEditNameModal = () => closeWithReturn(setIsEditNameModalOpen);

  const handleUpdateName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeProject) return;
    if (updatedName === activeProject.title) {
      closeEditNameModal();
      return;
    }
    const updatedProject = { ...activeProject, title: updatedName };
    setLocalActiveProject(updatedProject);
    onActiveProjectChange?.(updatedProject);
    setActiveProject(updatedProject);
    setProjects((prev: Project[]) =>
      Array.isArray(prev)
        ? prev.map((projectItem) =>
            projectItem.projectId === updatedProject.projectId
              ? { ...projectItem, title: updatedName }
              : projectItem
          )
        : prev
    );
    setUserProjects((prev: Project[]) =>
      Array.isArray(prev)
        ? prev.map((projectItem) =>
            projectItem.projectId === updatedProject.projectId
              ? { ...projectItem, title: updatedName }
              : projectItem
          )
        : prev
    );

    try {
      await queueUpdate({ title: updatedName });
      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: updatedName || activeProject.title,
            fields: { title: updatedName },
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user.userId,
          })
        );
      }
    } catch (error) {
      console.error("Failed to update project name:", error);
    } finally {
      closeEditNameModal();
    }
  };

  const openEditStatusModal = () => {
    setUpdatedStatus(localActiveProject.status?.toString?.() || "");
    setIsEditStatusModalOpen(true);
  };

  const closeEditStatusModal = () => setIsEditStatusModalOpen(false);

  const handleUpdateStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeProject) return;
    if (updatedStatus === String(activeProject.status ?? "")) {
      closeEditStatusModal();
      return;
    }
    const updatedProject = { ...localActiveProject, status: updatedStatus };
    setLocalActiveProject(updatedProject);
    onActiveProjectChange?.(updatedProject);
    setActiveProject(updatedProject);
    await queueUpdate({ status: updatedStatus });

    if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          action: "projectUpdated",
          projectId: activeProject.projectId,
          title: activeProject.title,
          fields: { status: updatedStatus },
          conversationId: `project#${activeProject.projectId}`,
          username: user?.firstName || "Someone",
          senderId: user.userId,
        })
      );
    }
    closeEditStatusModal();
  };

  const openFinishLineModal = () => {
    setSelectedFinishLineDate(toString(localActiveProject.finishline));
    setSelectedProductionStartDate(
      toString(localActiveProject.productionStart) ||
        toString(localActiveProject.dateCreated)
    );
    setIsFinishLineModalOpen(true);
  };

  const closeFinishLineModal = () => setIsFinishLineModalOpen(false);

  const handleUpdateFinishLine = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeProject) return;
    try {
      const updatedProject = {
        ...localActiveProject,
        finishline: selectedFinishLineDate,
        productionStart: selectedProductionStartDate,
      };
      setLocalActiveProject(updatedProject);
      onActiveProjectChange?.(updatedProject);
      setActiveProject(updatedProject);

      await queueUpdate({
        finishline: selectedFinishLineDate,
        productionStart: selectedProductionStartDate,
      });

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: activeProject.title,
            fields: {
              finishline: selectedFinishLineDate,
              productionStart: selectedProductionStartDate,
            },
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user.userId,
          })
        );
      }
    } catch (error) {
      console.error("Failed to update finish line:", error);
    } finally {
      closeFinishLineModal();
    }
  };

  const openDeleteConfirmationModal = (fromSettings = false) => {
    if (fromSettings) {
      openFromSettings(setIsConfirmDeleteModalOpen);
    } else {
      setReturnToSettings(false);
      setIsConfirmDeleteModalOpen(true);
    }
  };

  const closeDeleteConfirmationModal = () => {
    closeWithReturn(setIsConfirmDeleteModalOpen);
  };

  const handleDeleteProject = async () => {
    if (!activeProject?.projectId) {
      console.error("No active project to delete.");
      return;
    }
    const pid = activeProject.projectId;
    try {
      await apiFetch<{ success?: boolean }>(
        `${POST_PROJECT_TO_USER_URL}?userId=${userId}&projectId=${pid}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      onProjectDeleted(pid);
      await refreshUser();
    } catch (error: unknown) {
      console.error(
        "Error during project deletion:",
        (error as Error)?.message || error
      );
    }
    closeDeleteConfirmationModal();
    showWelcomeScreen();
  };

  const openThumbnailModal = (fromSettings = false) => {
    if (fromSettings) {
      openFromSettings(setIsThumbnailModalOpen);
    } else {
      setReturnToSettings(false);
      setIsThumbnailModalOpen(true);
    }
  };

  const closeThumbnailModal = () => {
    resetThumbnail();
    closeWithReturn(setIsThumbnailModalOpen);
  };

  const handleUploadThumbnail = async () => {
    if (!thumbnailState.file || !activeProject) return;
    try {
      await uploadThumbnail();
      closeThumbnailModal();
      resetThumbnail();
      console.log("Thumbnail updated successfully");
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
    }
  };

  const openColorModal = (fromSettings = false) => {
    if (fromSettings) {
      openFromSettings(setIsColorModalOpen);
    } else {
      setReturnToSettings(false);
      setIsColorModalOpen(true);
    }
    setSelectedColor((localActiveProject?.color as string) || "#FA3356");
  };

  const closeColorModal = () => {
    closeWithReturn(setIsColorModalOpen);
  };

  const handleSaveColor = async () => {
    if (!activeProject) return;
    try {
      const updatedLocal = { ...localActiveProject, color: selectedColor };
      setLocalActiveProject(updatedLocal);
      onActiveProjectChange?.(updatedLocal);
      setActiveProject(updatedLocal);
      await queueUpdate({ color: selectedColor });

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: activeProject.title,
            fields: { color: selectedColor },
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user.userId,
          })
        );
      }
    } catch (error) {
      console.error("Error updating color:", error);
    } finally {
      closeColorModal();
    }
  };

  const openInvoiceInfoModal = (fromSettings = false) => {
    if (fromSettings) {
      openFromSettings(setIsInvoiceInfoModalOpen);
    } else {
      setReturnToSettings(false);
      setIsInvoiceInfoModalOpen(true);
    }
  };

  const closeInvoiceInfoModal = () => {
    closeWithReturn(setIsInvoiceInfoModalOpen);
  };

  const handleSaveInvoiceInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeProject) return;
    try {
      const fields = {
        invoiceBrandName,
        invoiceBrandAddress,
        invoiceBrandPhone,
        clientName,
        clientAddress,
        clientPhone,
        clientEmail,
      };
      const updatedLocal = { ...localActiveProject, ...fields };
      setLocalActiveProject(updatedLocal);
      onActiveProjectChange?.(updatedLocal);
      setActiveProject(updatedLocal);
      await queueUpdate(fields);

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: activeProject.title,
            fields,
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user.userId,
          })
        );
      }
    } catch (error) {
      console.error("Error updating invoice info:", error);
    } finally {
      closeInvoiceInfoModal();
    }
  };

  const openSettingsModal = () => {
    setReturnToSettings(false);
    setIsSettingsModalOpen(true);
  };

  const pickColorFromScreen = async () => {
    const EyeDropperCtor = (
      window as typeof window & {
        EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
      }
    ).EyeDropper;
    if (EyeDropperCtor) {
      try {
        const eyeDropper = new EyeDropperCtor();
        const { sRGBHex } = await eyeDropper.open();
        setSelectedColor(sRGBHex);
      } catch (error) {
        console.error("EyeDropper cancelled or failed", error);
      }
    } else {
      alert("Your browser does not support the EyeDropper API.");
    }
  };

  return {
    isEditNameModalOpen,
    isEditStatusModalOpen,
    isFinishLineModalOpen,
    isInvoiceInfoModalOpen,
    isConfirmDeleteModalOpen,
    isSettingsModalOpen,
    isColorModalOpen,
    isThumbnailModalOpen,
    setIsSettingsModalOpen,
    openEditNameModal,
    closeEditNameModal,
    handleUpdateName,
    openEditStatusModal,
    handleUpdateStatus,
    openFinishLineModal,
    closeFinishLineModal,
    handleUpdateFinishLine,
    openDeleteConfirmationModal,
    closeDeleteConfirmationModal,
    handleDeleteProject,
    openThumbnailModal,
    closeThumbnailModal,
    handleThumbnailFileChange,
    handleThumbDragOver,
    handleThumbDragLeave,
    handleThumbDrop,
    handleRemoveThumbnail,
    handleUploadThumbnail,
    thumbnailInputRef,
    thumbnailState,
    setThumbnailCrop,
    setThumbnailZoom,
    setThumbnailCroppedArea,
    openColorModal,
    closeColorModal,
    handleSaveColor,
    openInvoiceInfoModal,
    closeInvoiceInfoModal,
    handleSaveInvoiceInfo,
    openSettingsModal,
    closeEditStatusModal,
    pickColorFromScreen,
  };
}
