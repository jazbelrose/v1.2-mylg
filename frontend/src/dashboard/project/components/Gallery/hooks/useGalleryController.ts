import { DragEventHandler, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { deleteGallery, deleteGalleryFiles, updateGallery } from "@/shared/utils/api";
import { slugify } from "@/shared/utils/slug";
import { sha256 } from "@/shared/utils/hash";
import useQueuedUpdate from "./useQueuedUpdate";
import useGalleryData from "./useGalleryData";
import { Gallery, GalleryController } from "../types";
import useGalleryCover from "./useGalleryCover";
import useGalleryUpload from "./useGalleryUpload";

const useGalleryController = (): GalleryController => {
  const {
    legacyGalleries,
    setLegacyGalleries,
    galleries,
    setGalleries,
    pendingSlugs,
    setPendingSlugs,
    recentlyCreated,
    loadGalleries,
    activeProjectId,
    activeProjectTitle,
    updateProjectFields,
    isAdmin,
    isBuilder,
    isDesigner,
    fetchProjects,
  } = useGalleryData();

  const navigate = useNavigate();

  const { queueUpdate, saving } = useQueuedUpdate(activeProjectId, updateProjectFields);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isModalDragging, setIsModalDragging] = useState(false);

  const [galleryName, setGalleryName] = useState("");
  const [gallerySlug, setGallerySlug] = useState("");
  const [galleryPassword, setGalleryPassword] = useState("");
  const [galleryPasswordEnabled, setGalleryPasswordEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [galleryTimeout, setGalleryTimeout] = useState<number>(15);
  const [galleryUrl, setGalleryUrl] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const {
    pendingCover,
    setPendingCover,
    coverUploadingIndex,
    coverOptions,
    setCoverOptions,
    coverPage,
    setCoverPage,
    handleChangeCover,
    chooseCoverUrl,
    handleUploadNewCover,
    handleCoverFileChange,
    currentCoverUrls,
    totalCoverPages,
    coverStartIndex,
  } = useGalleryCover({
    legacyGalleries,
    setLegacyGalleries,
    galleries,
    setGalleries,
    coverInputRef,
    activeProjectId,
    queueUpdate,
  });

  const {
    selectedFile,
    setSelectedFile,
    uploadProgress,
    uploading,
    isDragging,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleUpload,
    addFile,
  } = useGalleryUpload({
    activeProjectId,
    galleries,
    setGalleries,
    legacyGalleries,
    pendingSlugs,
    setPendingSlugs,
    galleryName,
    setGalleryName,
    gallerySlug,
    setGallerySlug,
    galleryPassword,
    galleryPasswordEnabled,
    galleryTimeout,
    setGalleryPassword,
    setShowPassword,
    setGalleryPasswordEnabled,
    setGalleryTimeout,
    setShowForm,
    fileInputRef,
  });

  useEffect(() => {
    setGallerySlug(galleryName ? slugify(galleryName) : "");
  }, [galleryName]);

  const handleModalDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    if (showForm || editingIndex !== null) return;
    e.preventDefault();
    setIsModalDragging(true);
  };

  const handleModalDragLeave: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsModalDragging(false);
  };

  const handleModalDrop: DragEventHandler<HTMLDivElement> = (e) => {
    if (showForm || editingIndex !== null) return;
    e.preventDefault();
    setIsModalDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setEditingIndex(null);
      setGalleryName("");
      setGallerySlug("");
      setGalleryPassword("");
      setGalleryUrl("");
      setShowPassword(false);
      setGalleryPasswordEnabled(false);
      setGalleryTimeout(15);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(true);
      addFile(file);
    }
  };

  const openModal = () => {
    void loadGalleries();
    setShowForm(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingIndex(null);
    setGalleryName("");
    setGallerySlug("");
    setGalleryPassword("");
    setGalleryUrl("");
    setShowPassword(false);
    setShowForm(false);
    setModalOpen(false);
  };

  const startEdit = (combinedIndex: number) => {
    const legacyCount = legacyGalleries.length;
    if (combinedIndex < legacyCount) return;
    const idx = combinedIndex - legacyCount;
    const g = galleries[idx];
    setEditingIndex(idx);
    setShowForm(true);
    setGalleryName(g?.name || "");
    setGallerySlug(g?.slug || slugify(g?.name || ""));
    setGalleryUrl(g?.url || g?.link || "");
    setGalleryPassword(g?.password || "");
    setShowPassword(false);
    setGalleryPasswordEnabled(g?.passwordEnabled !== false);
    setGalleryTimeout(Math.round(((g?.passwordTimeout || 15 * 60 * 1000) as number) / 60000));
    if (!isModalOpen) setModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !activeProjectId) return;

    const slugCollision = galleries.some(
      (g, idx) => idx !== editingIndex && (g.slug || slugify(g.name || "")) === gallerySlug
    );
    if (slugCollision) {
      toast.error("Slug already exists");
      return;
    }
    if (galleryUrl && !/^https?:\/\//i.test(galleryUrl)) {
      toast.error("URL must start with http or https");
      return;
    }

    const updated = [...galleries];
    const original = updated[editingIndex];
    const passwordHash = galleryPassword ? await sha256(galleryPassword) : "";

    updated[editingIndex] = {
      ...original,
      name: galleryName,
      slug: gallerySlug,
      url: galleryUrl || original?.url,
      password: galleryPassword,
      passwordHash,
      passwordEnabled: galleryPasswordEnabled,
      passwordTimeout: galleryTimeout * 60 * 1000,
    };
    setGalleries(updated);

    setEditingIndex(null);
    setGalleryName("");
    setGallerySlug("");
    setGalleryUrl("");
    setGalleryPassword("");
    setShowPassword(false);
    setGalleryPasswordEnabled(false);
    setGalleryTimeout(15);
    setShowForm(false);

    if (original?.galleryId) {
      try {
        await updateGallery(original.galleryId, {
          ...updated[editingIndex],
          projectId: activeProjectId,
        });
      } catch (err) {
        console.error("Failed to update gallery record", err);
      }
    }
    await queueUpdate({ galleries: updated });
  };

  const handleDeleteGallery = (combinedIndex: number) => {
    const legacyCount = legacyGalleries.length;
    if (combinedIndex < legacyCount) return;
    const idx = combinedIndex - legacyCount;
    const g = galleries[idx];
    if (!g) return;
    setDeleteIndex(idx);
    setIsConfirmingDelete(true);
  };

  const confirmDeleteGallery = async () => {
    if (deleteIndex === null || !activeProjectId) {
      setIsConfirmingDelete(false);
      return;
    }
    const index = deleteIndex;
    const g = galleries[index];
    setDeleteIndex(null);

    const toastId = toast.loading("Deleting gallery...");
    try {
      await deleteGallery(g.galleryId || g.id, activeProjectId);
      await deleteGalleryFiles(activeProjectId, g.galleryId || g.id, g.slug);
      const updated = galleries.filter((_, i) => i !== index);
      setGalleries(updated);
      toast.update(toastId, {
        render: "Gallery deleted",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error("Delete gallery failed:", err);
      toast.update(toastId, {
        render: "Delete failed",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  const combinedGalleries = useMemo(
    () => [...legacyGalleries, ...galleries],
    [legacyGalleries, galleries]
  );

  const legacyCount = legacyGalleries.length;
  const hasGalleries = combinedGalleries.length > 0;

  const handleTriggerClick = async () => {
    if (combinedGalleries.length > 0) {
      const lastGallery = combinedGalleries[combinedGalleries.length - 1];
      const slug = lastGallery.slug || slugify(lastGallery.name || "");
      await fetchProjects(1);
      navigate(`/gallery/${slugify(activeProjectTitle || "")}/${slug}`);
    } else {
      openModal();
    }
  };

  const handleGalleryNavigate = async (galleryItem: Gallery, slug: string) => {
    const useLink =
      !galleryItem.updatedSvgUrl && !galleryItem.updatedPdfUrl && !galleryItem.url && galleryItem.link;
    if (useLink && galleryItem.link) {
      const target =
        galleryItem.link.startsWith("/") || /^https?:\/\//i.test(galleryItem.link)
          ? galleryItem.link
          : `/${galleryItem.link}`;
      window.location.assign(target);
      return;
    }

    await fetchProjects(1);
    navigate(`/gallery/${slugify(activeProjectTitle || "")}/${slug}`);
  };

  const isEditing = editingIndex !== null;
  const isCreating = showForm && !isEditing;
  const editingCombinedIndex = isEditing ? (editingIndex as number) + legacyCount : null;
  const displayedGalleries = isEditing
    ? [combinedGalleries[editingCombinedIndex as number]].filter(Boolean) as Gallery[]
    : isCreating
    ? []
    : combinedGalleries;

  return {
    saving,
    isAdmin,
    isBuilder,
    isDesigner,
    galleries,
    legacyGalleries,
    combinedGalleries,
    displayedGalleries,
    recentlyCreated,
    legacyCount,
    hasGalleries,
    isModalOpen,
    openModal,
    closeModal,
    showForm,
    setShowForm,
    editingIndex,
    setEditingIndex,
    editingCombinedIndex,
    isEditing,
    isCreating,
    handleTriggerClick,
    handleGalleryNavigate,
    handleModalDragOver,
    handleModalDragLeave,
    handleModalDrop,
    handleFileChange,
    handleCoverFileChange,
    fileInputRef,
    coverInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isDragging,
    isModalDragging,
    setIsModalDragging,
    selectedFile,
    setSelectedFile,
    uploading,
    uploadProgress,
    galleryName,
    setGalleryName,
    gallerySlug,
    setGallerySlug,
    galleryPassword,
    setGalleryPassword,
    galleryPasswordEnabled,
    setGalleryPasswordEnabled,
    showPassword,
    setShowPassword,
    galleryTimeout,
    setGalleryTimeout,
    galleryUrl,
    setGalleryUrl,
    handleUpload,
    handleSaveEdit,
    startEdit,
    handleDeleteGallery,
    confirmDeleteGallery,
    isConfirmingDelete,
    setIsConfirmingDelete,
    deleteIndex,
    setDeleteIndex,
    coverOptions,
    setCoverOptions,
    handleChangeCover,
    chooseCoverUrl,
    handleUploadNewCover,
    currentCoverUrls,
    totalCoverPages,
    coverStartIndex,
    coverPage,
    setCoverPage,
    coverUploadingIndex,
    pendingCover,
    setPendingCover,
  };
};

export default useGalleryController;
