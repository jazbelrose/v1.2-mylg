import { forwardRef, useCallback, useImperativeHandle } from "react";
import Modal from "../../../shared/ui/ModalWithStack";
import ConfirmModal from "@/shared/ui/ConfirmModal";
import { FileText, Download, Layout, Upload as UploadIcon, PenTool } from "lucide-react";
import { useData } from "@/app/contexts/useData";
import { useSocket } from "@/app/contexts/useSocket";
import styles from "./file-manager.module.css";
import FileManagerToolbar from "./FileManagerToolbar";
import FileManagerContent from "./FileManagerContent";
import FileManagerFooter from "./FileManagerFooter";
import FilePreviewModal from "./FilePreviewModal";
import { useFileManagerState } from "./hooks/useFileManagerState";
import { useFileMessenger } from "./hooks/useFileMessenger";
import { useFileTransfers } from "./hooks/useFileTransfers";
import type { Message } from "@/app/contexts/DataProvider";
import type { FileManagerProps, FileManagerRef, FolderOption } from "./fileManagerTypes";

export type { FileManagerProps, FileManagerRef, FileItem } from "./fileManagerTypes";

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
            systemFolders={SYSTEM_FOLDERS}
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









