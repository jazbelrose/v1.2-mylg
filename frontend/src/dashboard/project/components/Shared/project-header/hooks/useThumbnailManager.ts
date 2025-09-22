import { useEffect, useRef, useState } from "react";

import type { Project } from "@/app/contexts/DataProvider";
import { uploadData } from "aws-amplify/storage";
import { Area } from "react-easy-crop";

interface UserSummary {
  firstName?: string | null;
  userId: string;
}

interface UseThumbnailManagerParams {
  activeProject: Project | null;
  localActiveProject: Project;
  setLocalActiveProject: React.Dispatch<React.SetStateAction<Project>>;
  onActiveProjectChange?: (project: Project) => void;
  setActiveProject: (project: Project) => void;
  queueUpdate: (payload: Partial<Project>) => Promise<void>;
  ws?: WebSocket;
  user: UserSummary | null;
}

interface ThumbnailState {
  preview: string | null;
  file: File | null;
  crop: { x: number; y: number };
  zoom: number;
  croppedArea: Area | null;
  isDragging: boolean;
  isUploading: boolean;
}

export function useThumbnailManager({
  activeProject,
  localActiveProject,
  setLocalActiveProject,
  onActiveProjectChange,
  setActiveProject,
  queueUpdate,
  ws,
  user,
}: UseThumbnailManagerParams) {
  const [state, setState] = useState<ThumbnailState>({
    preview: null,
    file: null,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedArea: null,
    isDragging: false,
    isUploading: false,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (state.preview) {
      return () => {
        URL.revokeObjectURL(state.preview as string);
      };
    }
    return undefined;
  }, [state.preview]);

  const setCrop = (crop: { x: number; y: number }) => {
    setState((prev) => ({ ...prev, crop }));
  };

  const setZoom = (zoom: number) => {
    setState((prev) => ({ ...prev, zoom }));
  };

  const setCroppedArea = (area: Area) => {
    setState((prev) => ({ ...prev, croppedArea: area }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setState((prev) => {
        if (prev.preview) URL.revokeObjectURL(prev.preview);
        return {
          ...prev,
          file,
          preview: URL.createObjectURL(file),
          crop: { x: 0, y: 0 },
          zoom: 1,
        };
      });
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setState((prev) => ({ ...prev, isDragging: true }));
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setState((prev) => ({ ...prev, isDragging: false }));
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    setState((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview);
      return {
        ...prev,
        isDragging: false,
        file,
        preview: file ? URL.createObjectURL(file) : null,
        crop: { x: 0, y: 0 },
        zoom: 1,
      };
    });
  };

  const reset = () => {
    setState((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview);
      if (inputRef.current) inputRef.current.value = "";
      return {
        ...prev,
        file: null,
        preview: null,
        crop: { x: 0, y: 0 },
        zoom: 1,
      };
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", (err) => reject(err));
      img.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    cropArea: Area,
    type = "image/jpeg"
  ): Promise<Blob> => {
    const img = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      cropArea.width,
      cropArea.height
    );
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob as Blob), type);
    });
  };

  const uploadThumbnail = async () => {
    if (!state.file || !activeProject) return;
    try {
      setState((prev) => ({ ...prev, isUploading: true }));
      const croppedBlob =
        state.croppedArea && state.preview
          ? await getCroppedImg(state.preview, state.croppedArea, state.file.type)
          : state.file;

      const baseKey = `project-thumbnails/${activeProject.projectId}/${state.file.name}`;
      await uploadData({
        key: baseKey,
        data: croppedBlob,
        options: { accessLevel: "public" },
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const fullKey = `public/${baseKey}`;

      const updatedLocal: Project = {
        ...localActiveProject,
        thumbnails: Array.from(
          new Set([fullKey, ...(localActiveProject.thumbnails || [])])
        ),
      };
      setLocalActiveProject(updatedLocal);
      onActiveProjectChange?.(updatedLocal);
      setActiveProject(updatedLocal);

      await queueUpdate({ thumbnails: [fullKey] });

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: activeProject.title,
            fields: { thumbnails: [fullKey] },
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user?.userId ?? "",
          })
        );
      }
    } finally {
      setState((prev) => ({ ...prev, isUploading: false }));
    }
  };

  return {
    state,
    inputRef,
    setCrop,
    setZoom,
    setCroppedArea,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    reset,
    uploadThumbnail,
  };
}
