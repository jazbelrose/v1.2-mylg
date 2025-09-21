import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";
import Modal from "../../../../shared/ui/ModalWithStack";
import ConfirmModal from "@/shared/ui/ConfirmModal";
import { FileText, Download, Layout, Upload as UploadIcon, PenTool } from "lucide-react";
import { useData } from "@/app/contexts/useData";
import { useSocket } from "@/app/contexts/useSocket";
import styles from "./file-manager.module.css";
import FileManagerToolbar from "./FileManagerToolbar";
import FileManagerContent from "./FileManagerContent";
import FileManagerFooter from "./FileManagerFooter";
import FilePreviewModal from "./FilePreviewModal";
import { useFileManagerState } from "../Shared/hooks/useFileManagerState";
import { useFileMessenger } from "../Shared/hooks/useFileMessenger";
import { useFileTransfers } from "../Shared/hooks/useFileTransfers";
import type { Message } from "@/app/contexts/DataProvider";
import type { FileManagerProps, FileManagerRef, FolderOption } from "./FileManagerTypes";
import { notify } from "@/shared/ui/ToastNotifications";
import { updateProjectFields } from "@/shared/utils/api";

export type { FileManagerProps, FileManagerRef, FileItem } from "./FileManagerTypes";

if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

const SYSTEM_FOLDERS: FolderOption[] = [
  { key: "uploads", name: "User Files" },
  { key: "drawings", name: "Drawings" },
  { key: "invoices", name: "Documents" },
  { key: "downloads", name: "Downloads" },
];

const getFolderIcon = (key: string, size = 24) => {
  switch (key) {
    case "uploads":
      return <UploadIcon size={size} />;
    case "invoices":
      return <FileText size={size} />;
    case "downloads":
      return <Download size={size} />;
    case "floorplans":
      return <Layout size={size} />;
    default:
      return <PenTool size={size} />;
  }
};

const FileManagerComponent = forwardRef<FileManagerRef, FileManagerProps>(
  (
    {
      folder = "uploads",
      displayName,
      style,
      showTrigger = true,
      isOpen,
      onRequestClose,
    }: FileManagerProps,
    ref
  ) => {
    const {
      activeProject,
      user,
      isAdmin,
      isBuilder,
      isDesigner,
      projectMessages = {},
      setProjectMessages = () => {},
    } = useData();
    const { ws } = useSocket() || {};

    const canUpload = isAdmin || isBuilder || isDesigner || folder === "uploads";
    const canDelete = isAdmin || isBuilder || isDesigner;

    const state = useFileManagerState({
      folder,
      displayName,
      isOpen,
      onRequestClose,
      activeProject,
    });

    const {
      fileInputRef,
      scrollerRef,
      folderKey,
      setFolderKey,
      renderedName,
      setSelectedFiles,
      isFilesModalOpen,
      setFilesModalOpen,
      closeFilesModal,
      isImageModalOpen,
      selectedImage,
      currentIndex,
      selectedItems,
      setSelectedItems,
      isSelectMode,
      setIsSelectMode,
      toggleSelectMode,
      isConfirmingDelete,
      setIsConfirmingDelete,
      isDragging,
      setIsDragging,
      isLoading,
      setIsLoading,
      searchTerm,
      setSearchTerm,
      viewMode,
      toggleViewMode,
      layoutIconToUse,
      sortOption,
      setSortOption,
      filterOption,
      setFilterOption,
      filterOptionsList,
      displayedFiles,
      customFolders,
      setCustomFolders,
      handleSelectionChange,
      handleSelectAll,
      isSelected,
      handleFileClick,
      closeImageModal,
      selectedFilesCount,
      localActiveProject,
      setLocalActiveProject,
      handleTouchStart,
      handleTouchMove,
      handleTouchEnd,
      sortOptionsList,
    } = state;

    const folderOptions = useMemo(() => {
      const seen = new Set<string>();
      return [...SYSTEM_FOLDERS, ...customFolders].filter((option) => {
        if (!option?.key || seen.has(option.key)) return false;
        seen.add(option.key);
        return true;
      });
    }, [customFolders]);

    const { removeReferences } = useFileMessenger({
      activeProject: activeProject || {},
      localActiveProject,
      setLocalActiveProject,
      setProjectMessages,
      user,
      ws,
    });

    const {
      loadFiles,
      handleFileSelect,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleBulkDownload,
      handleDelete,
      performDelete,
      handleDeleteSingle,
      handleDownloadSingle,
    } = useFileTransfers({
      activeProject: activeProject || {},
      folderKey,
      selectedItems,
      setSelectedFiles,
      setSelectedItems,
      setIsSelectMode,
      setIsLoading,
      setIsConfirmingDelete,
      setIsDragging,
      setLocalActiveProject,
      removeReferences,
      projectMessages: projectMessages as Record<string, Message[]>,
      canDelete,
    });

    const handleCreateFolder = useCallback(async () => {
      if (!canUpload) {
        notify("error", "You do not have permission to create folders.");
        return;
      }

      if (typeof window === "undefined") return;

      const rawName = window.prompt("New folder name");
      if (rawName == null) return;

      const normalizedName = rawName.replace(/\s+/g, " ").trim();
      if (!normalizedName) {
        notify("warning", "Folder name cannot be empty.");
        return;
      }

      if (
        folderOptions.some((folderOption) => folderOption.name.toLowerCase() === normalizedName.toLowerCase())
      ) {
        notify("warning", "A folder with that name already exists.");
        return;
      }

      const baseSlug = normalizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fallbackSlug = baseSlug || normalizedName.toLowerCase().replace(/\s+/g, "-") || "folder";

      const existingKeys = new Set(folderOptions.map((option) => option.key));
      let candidateKey = fallbackSlug;
      let suffix = 1;
      while (!candidateKey || existingKeys.has(candidateKey)) {
        candidateKey = `${fallbackSlug || "folder"}-${suffix}`;
        suffix += 1;
      }

      const newFolder: FolderOption = { key: candidateKey, name: normalizedName };
      const previousFolders = customFolders;
      const previousKey = folderKey;

      const projectId = activeProject?.projectId as string | undefined;
      if (!projectId) {
        notify("error", "Select a project before creating folders.");
        return;
      }

      const updatedCustomFolders = [...previousFolders, newFolder];

      setCustomFolders(updatedCustomFolders);
      setFolderKey(candidateKey);
      setLocalActiveProject((prev) => ({
        ...(prev || {}),
        fileManagerFolders: updatedCustomFolders,
      }));

      try {
        await updateProjectFields(projectId, { fileManagerFolders: updatedCustomFolders });
        notify("success", `Created folder "${normalizedName}".`);
      } catch (error) {
        console.error("Failed to persist new folder", error);
        notify("error", "We couldn't save the new folder. Please try again.");
        setCustomFolders(previousFolders);
        setLocalActiveProject((prev) => ({
          ...(prev || {}),
          fileManagerFolders: previousFolders,
        }));
        setFolderKey(previousKey);
      }
    }, [
      activeProject?.projectId,
      canUpload,
      customFolders,
      folderKey,
      folderOptions,
      setCustomFolders,
      setFolderKey,
      setLocalActiveProject,
    ]);

    const openFilesModal = useCallback(async () => {
      setFilesModalOpen(true);
      await loadFiles();
    }, [loadFiles, setFilesModalOpen]);

    useImperativeHandle(ref, () => ({
      open: openFilesModal,
      close: closeFilesModal,
    }));

    return (
      <>
        {showTrigger && (
          <div
            className={`dashboard-item files files-shared-style ${styles.fileManager}`}
            onClick={() => void openFilesModal()}
            style={style}
          >
            <div className={styles.fileManagerInner}>
              <span className={styles.icon}>{getFolderIcon(folderKey)}</span>
              <span>{renderedName}</span>
            </div>
            <span className={styles.arrow}>&gt;</span>
          </div>
        )}

        <Modal
          isOpen={isFilesModalOpen}
          onRequestClose={closeFilesModal}
          contentLabel="Files Modal"
          shouldCloseOnOverlayClick={!isConfirmingDelete}
          style={{ overlay: { pointerEvents: isConfirmingDelete ? "none" : "auto" } }}
          className={{
            base: styles.fileModalContent,
            afterOpen: styles.fileModalContentAfterOpen,
            beforeClose: styles.fileModalContentBeforeClose,
          }}
          overlayClassName={{
            base: styles.fileModalOverlay,
            afterOpen: styles.fileModalOverlayAfterOpen,
            beforeClose: styles.fileModalOverlayBeforeClose,
          }}
          closeTimeoutMS={300}
        >
          <FileManagerToolbar
            folderKey={folderKey}
            folders={folderOptions}
            onFolderChange={setFolderKey}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterOption={filterOption}
            filterOptions={filterOptionsList}
            onFilterChange={setFilterOption}
            sortOption={sortOption}
            sortOptions={sortOptionsList}
            onSortChange={setSortOption}
            onToggleView={toggleViewMode}
            layoutIcon={layoutIconToUse}
            onClose={closeFilesModal}
            renderFolderIcon={getFolderIcon}
            canCreateFolders={canUpload}
            onCreateFolder={handleCreateFolder}
          />

          <FileManagerContent
            scrollerRef={scrollerRef}
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            isLoading={isLoading}
            displayedFiles={displayedFiles}
            isSelectMode={isSelectMode}
            onSelectAll={handleSelectAll}
            selectedItems={selectedItems}
            selectedFilesCount={selectedFilesCount}
            viewMode={viewMode}
            onFileClick={handleFileClick}
            onSelectionChange={handleSelectionChange}
            isSelected={isSelected}
            onDownloadSingle={handleDownloadSingle}
            onDeleteSingle={handleDeleteSingle}
            canDelete={canDelete}
            folderKey={folderKey}
          />

          <FileManagerFooter
            selectedFilesCount={selectedFilesCount}
            canUpload={canUpload}
            canDelete={canDelete}
            isSelectMode={isSelectMode}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onToggleSelectMode={toggleSelectMode}
            onBulkDownload={handleBulkDownload}
            onDeleteSelected={handleDelete}
            onCancelSelection={() => {
              setIsSelectMode(false);
              setSelectedItems(new Set());
            }}
          />
        </Modal>

        <ConfirmModal
          isOpen={isConfirmingDelete}
          onRequestClose={() => setIsConfirmingDelete(false)}
          onConfirm={performDelete}
          message="Are you sure you want to delete the selected files?"
          className={{
            base: styles.confirmContent,
            afterOpen: styles.confirmContentAfterOpen,
            beforeClose: styles.confirmContentBeforeClose,
          }}
          overlayClassName={{
            base: styles.confirmOverlay,
            afterOpen: styles.confirmOverlayAfterOpen,
            beforeClose: styles.confirmOverlayBeforeClose,
          }}
        />

        <FilePreviewModal
          isOpen={isImageModalOpen}
          onRequestClose={closeImageModal}
          displayedFiles={displayedFiles}
          currentIndex={currentIndex}
          selectedImage={selectedImage}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </>
    );
  }
);

FileManagerComponent.displayName = "FileManagerComponent";

export default FileManagerComponent;









