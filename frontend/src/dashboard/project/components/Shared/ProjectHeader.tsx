import React, { useEffect, useState } from "react";

import "./project-header.css";

import MobileProjectHeader from "@/dashboard/project/components/Shared/MobileProjectHeader";
import TeamModal from "@/dashboard/project/components/Shared/TeamModal";

import DesktopProjectHeader from "./project-header/DesktopProjectHeader";
import { useProjectHeaderBase } from "./project-header/hooks/useProjectHeaderBase";
import { useProjectHeaderModals } from "./project-header/hooks/useProjectHeaderModals";
import { hexToRgb } from "./project-header/utils";
import ColorModal from "./project-header/modals/ColorModal";
import DeleteConfirmationModal from "./project-header/modals/DeleteConfirmationModal";
import EditNameModal from "./project-header/modals/EditNameModal";
import EditStatusModal from "./project-header/modals/EditStatusModal";
import FinishLineModal from "./project-header/modals/FinishLineModal";
import InvoiceInfoModal from "./project-header/modals/InvoiceInfoModal";
import SettingsModal from "./project-header/modals/SettingsModal";
import ThumbnailModal from "./project-header/modals/ThumbnailModal";

import type { Project } from "@/app/contexts/DataProvider";

interface ProjectHeaderProps {
  title?: string;
  parseStatusToNumber: (status: string | number | undefined) => number;
  userId: string;
  onProjectDeleted: (projectId: string) => void;
  activeProject: Project | null;
  showWelcomeScreen: () => void;
  onActiveProjectChange?: (project: Project) => void;
  onOpenFiles: () => void;
  onOpenQuickLinks: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  parseStatusToNumber,
  userId,
  onProjectDeleted,
  activeProject,
  showWelcomeScreen,
  onActiveProjectChange,
  onOpenFiles,
  onOpenQuickLinks,
}) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {};
    }
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  const base = useProjectHeaderBase({
    activeProject,
    onActiveProjectChange,
  });

  const modals = useProjectHeaderModals({
    activeProject,
    base,
    showWelcomeScreen,
    onProjectDeleted,
    userId,
  });

  const {
    saving,
    projectId,
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
    isAdmin,
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
    localActiveProject,
  } = base;

  const {
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
    pickColorFromScreen,
    closeFinishLineModal,
    closeEditStatusModal,
  } = modals;

  const openTeamModal = () => setIsTeamModalOpen(true);
  const closeTeamModal = () => setIsTeamModalOpen(false);

  return (
    <div>
      {saving && <div style={{ color: "#FA3356" }}>Saving...</div>}

      {isMobile ? (
        <MobileProjectHeader
          projectName={localActiveProject ? localActiveProject.title : "Summary"}
          projectInitial={projectInitial}
          thumbnailKey={localActiveProject?.thumbnails?.[0] as string | undefined}
          statusLabel={displayStatus}
          progressValue={parseStatusToNumber(localActiveProject?.status)}
          rangeLabel={mobileRangeLabel || undefined}
          teamMembers={teamMembers}
          onOpenQuickLinks={onOpenQuickLinks}
          onOpenFiles={onOpenFiles}
          onOpenSettings={openSettingsModal}
          onOpenTeam={openTeamModal}
          onOpenFinishLine={openFinishLineModal}
          onOpenStatus={openEditStatusModal}
          onOpenThumbnail={() => openThumbnailModal(false)}
          tabs={tabs}
          activeTabKey={activeTabKey}
          onSelectTab={(tab) => confirmNavigate(tab.path)}
        />
      ) : (
        <DesktopProjectHeader
          project={localActiveProject}
          projectId={projectId}
          projectInitial={projectInitial}
          displayStatus={displayStatus}
          parseStatusToNumber={parseStatusToNumber}
          rangeLabel={rangeLabel}
          teamMembers={teamMembers}
          onOpenThumbnail={() => openThumbnailModal(false)}
          onOpenStatus={openEditStatusModal}
          onOpenTeam={openTeamModal}
          onOpenFinishLine={openFinishLineModal}
          onOpenSettings={openSettingsModal}
          onOpenQuickLinks={onOpenQuickLinks}
          onOpenFiles={onOpenFiles}
          onKeyDown={handleKeyDown}
        />
      )}

      <EditNameModal
        isOpen={isEditNameModalOpen}
        value={updatedName}
        onChange={setUpdatedName}
        onSubmit={handleUpdateName}
        onClose={closeEditNameModal}
      />

      <FinishLineModal
        isOpen={isFinishLineModalOpen}
        productionStartDate={selectedProductionStartDate}
        finishLineDate={selectedFinishLineDate}
        onProductionStartChange={setSelectedProductionStartDate}
        onFinishLineChange={setSelectedFinishLineDate}
        onSubmit={handleUpdateFinishLine}
        onClose={closeFinishLineModal}
      />

      <EditStatusModal
        isOpen={isEditStatusModalOpen}
        value={updatedStatus}
        onChange={setUpdatedStatus}
        onSubmit={handleUpdateStatus}
        onClose={closeEditStatusModal}
      />

      <ThumbnailModal
        isOpen={isThumbnailModalOpen}
        thumbnailPreview={thumbnailState.preview}
        isDragging={thumbnailState.isDragging}
        isUploading={thumbnailState.isUploading}
        crop={thumbnailState.crop}
        zoom={thumbnailState.zoom}
        onCropChange={setThumbnailCrop}
        onZoomChange={setThumbnailZoom}
        onCropComplete={(cropped) => setThumbnailCroppedArea(cropped)}
        onFileChange={handleThumbnailFileChange}
        onDragOver={handleThumbDragOver}
        onDragLeave={handleThumbDragLeave}
        onDrop={handleThumbDrop}
        onRemoveThumbnail={handleRemoveThumbnail}
        onUploadThumbnail={handleUploadThumbnail}
        onClose={closeThumbnailModal}
        fileInputRef={thumbnailInputRef}
      />

      <ColorModal
        isOpen={isColorModalOpen}
        color={selectedColor}
        rgbLabel={hexToRgb(selectedColor)}
        onColorChange={setSelectedColor}
        onPickColor={pickColorFromScreen}
        onSave={handleSaveColor}
        onClose={closeColorModal}
      />

      <InvoiceInfoModal
        isOpen={isInvoiceInfoModalOpen}
        invoiceBrandName={invoiceBrandName}
        invoiceBrandAddress={invoiceBrandAddress}
        invoiceBrandPhone={invoiceBrandPhone}
        clientName={clientName}
        clientAddress={clientAddress}
        clientPhone={clientPhone}
        clientEmail={clientEmail}
        onChange={(field, value) => {
          switch (field) {
            case "invoiceBrandName":
              setInvoiceBrandName(value);
              break;
            case "invoiceBrandAddress":
              setInvoiceBrandAddress(value);
              break;
            case "invoiceBrandPhone":
              setInvoiceBrandPhone(value);
              break;
            case "clientName":
              setClientName(value);
              break;
            case "clientAddress":
              setClientAddress(value);
              break;
            case "clientPhone":
              setClientPhone(value);
              break;
            case "clientEmail":
              setClientEmail(value);
              break;
            default:
              break;
          }
        }}
        onSubmit={handleSaveInvoiceInfo}
        onClose={closeInvoiceInfoModal}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        isAdmin={!!isAdmin}
        onEditName={() => {
          setIsSettingsModalOpen(false);
          openEditNameModal(true);
        }}
        onEditThumbnail={() => {
          setIsSettingsModalOpen(false);
          openThumbnailModal(true);
        }}
        onChangeColor={() => {
          setIsSettingsModalOpen(false);
          openColorModal(true);
        }}
        onEditInvoiceInfo={() => {
          setIsSettingsModalOpen(false);
          openInvoiceInfoModal(true);
        }}
        onDeleteProject={() => {
          setIsSettingsModalOpen(false);
          openDeleteConfirmationModal(true);
        }}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <DeleteConfirmationModal
        isOpen={isConfirmDeleteModalOpen}
        onConfirm={handleDeleteProject}
        onCancel={closeDeleteConfirmationModal}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onRequestClose={closeTeamModal}
        members={teamMembers}
      />
    </div>
  );
};

export default React.memo(ProjectHeader);
