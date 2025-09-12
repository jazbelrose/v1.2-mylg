// src/pages/dashboard/Messages.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  CSSProperties,
} from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/app/contexts/useData";
import { Thread } from "@/app/contexts/DataProvider";
import { useAuth } from "@/app/contexts/useAuth";
import { useOnlineStatus } from '@/app/contexts/OnlineStatusContext';
import { useDMConversation } from "@/app/contexts/useDMConversation";
import { useSocket } from "@/app/contexts/useSocket"; // <-- ADDED
import {
  dedupeById,
  mergeAndDedupeMessages,
  DMMessage,
  DMFile,
} from "@/shared/utils/messageUtils";
import User from "@/assets/svg/user.svg?react";
import { normalizeMessage } from "@/shared/utils/websocketUtils";
import { getWithTTL, setWithTTL } from "@/shared/utils/storageWithTTL";
import SpinnerOverlay from "@/shared/ui/SpinnerOverlay";
import OptimisticImage from "@/shared/ui/OptimisticImage";
import { uploadData } from "aws-amplify/storage";
import {
  FaFilePdf,
  FaFileExcel,
  FaFileAlt,
  FaDraftingCompass,
  FaCube,
} from "react-icons/fa";
import {
  SiAdobe,
  SiAffinitydesigner,
  SiAffinitypublisher,
  SiSvg,
} from "react-icons/si";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faDownload } from "@fortawesome/free-solid-svg-icons";
import Modal from "@/shared/ui/ModalWithStack";
import ConfirmModal from "@/shared/ui/ConfirmModal";
import PromptModal from "@/shared/ui/PromptModal";
import { slugify, findUserBySlug } from "@/shared/utils/slug";
import {
  MESSAGES_THREADS_URL,
  DELETE_FILE_FROM_S3_URL,
  EDIT_MESSAGE_URL,
  S3_PUBLIC_BASE,
  apiFetch,
} from "@/shared/utils/api";
import MessageItem, { ChatMessage } from "@/features/messages/MessageItem";
import "@/features/messages/project-messages-thread.css";

// Accessibility binding
if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

/* ----------------------------------
   Types
----------------------------------- */
type ID = string;

interface AppUser {
  userId: ID;
  firstName?: string;
  lastName?: string;
  thumbnail?: string;
  role?: string;
  collaborators?: ID[];
  messages?: DMMessage[];
  [key: string]: unknown;
}

interface MessagesProps {
  initialUserSlug?: string | null;
}

/* ----------------------------------
   Helpers
----------------------------------- */

// Make apiFetch tolerant whether it returns Response or already JSON
const msgKey = (convId: string) => `messages_${convId}`;

const getThumbnailUrl = (url: string, folderKey = "chat_uploads") =>
  url.replace(`/${folderKey}/`, `/${folderKey}_thumbnails/`);

const getFileNameFromUrl = (url: string) => url.split("/").pop() || "";

const renderFilePreview = (file: DMFile, folderKey = "chat_uploads") => {
  const extension = file.fileName.split(".").pop()?.toLowerCase() || "";
  const commonStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  if (["jpg", "jpeg", "png"].includes(extension)) {
    const thumbnailUrl = getThumbnailUrl(file.url, folderKey);
    const finalUrl = file.finalUrl || file.url;
    return <OptimisticImage tempUrl={thumbnailUrl} finalUrl={finalUrl} alt={file.fileName} />;
  }
  if (extension === "pdf") {
    return (
      <div style={commonStyle}>
        <FaFilePdf size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }
  if (extension === "svg") {
    return (
      <div style={commonStyle}>
        <SiSvg size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }
  if (extension === "txt") {
    return (
      <div style={commonStyle}>
        <FaFileAlt size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }
  if (["xls", "xlsx", "csv"].includes(extension)) {
    return (
      <div style={commonStyle}>
        <FaFileExcel size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }
  if (["dwg", "vwx"].includes(extension)) {
    return (
      <div style={commonStyle}>
        <FaDraftingCompass size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }
  if (["c4d", "obj"].includes(extension)) {
    return (
      <div style={commonStyle}>
        <FaCube size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }
  if (extension === "ai") {
    return (
      <div style={commonStyle}>
        <SiAdobe size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }
  if (extension === "afdesign") {
    return (
      <div style={commonStyle}>
        <SiAffinitydesigner size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }
  if (extension === "afpub") {
    return (
      <div style={commonStyle}>
        <SiAffinitypublisher size={50} />
        <span>{file.fileName}</span>
      </div>
    );
  }

  return (
    <div style={commonStyle}>
      <FaFileAlt size={50} />
      <span>{file.fileName}</span>
    </div>
  );
};

/* ----------------------------------
   Component
----------------------------------- */

const Messages: React.FC<MessagesProps> = ({ initialUserSlug = null }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth() as { isAuthenticated: boolean };

  const {
    userData,
    allUsers,
    isAdmin,
    setUserData,
    setDmReadStatus,
    setDmThreads,
    deletedMessageIds,
    markMessageDeleted,
    toggleReaction,
    dmThreads,
  } = useData() as unknown as {
    userData: AppUser;
    allUsers: AppUser[];
    isAdmin: boolean;
    dmThreads: Thread[];
    setUserData: React.Dispatch<React.SetStateAction<AppUser>>;
    setDmThreads: React.Dispatch<React.SetStateAction<Thread[]>>;
    setDmReadStatus: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    deletedMessageIds: Set<string>;
    markMessageDeleted: (id: string) => void;
    toggleReaction: (
      messageId: string,
      emoji: string,
      userId: string,
      conversationId: string,
      type: "dm",
      ws?: WebSocket | null
    ) => void;
  };

  // presence: query with helper instead of inspecting raw list
  const { isOnline } = useOnlineStatus() as { isOnline: (id?: string | null) => boolean };

  const { setActiveDmConversationId } = useDMConversation() as {
    setActiveDmConversationId: (id: string | null) => void;
  };

  // now available after adding the import above
  const { ws } = useSocket() as { ws: WebSocket | null };

  const isCurrentUserAdmin = isAdmin;

  const [isMobile, setIsMobile] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    if (typeof window !== "undefined") {
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // map for unread badge
  const threadMap = useMemo<Record<string, boolean>>(
    () =>
      dmThreads.reduce((acc, t) => {
        acc[t.conversationId] = t.read === false;
        return acc;
      }, {} as Record<string, boolean>),
    [dmThreads]
  );

  // Local state
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // 🔥 Removed watcher effect (setWatchedUserIds/refreshPresence) — presence is push-only now

  const [newMessage, setNewMessage] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPreviewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<DMFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DMMessage | null>(null);
  const [editTarget, setEditTarget] = useState<DMMessage | null>(null);

  const folderKey = "chat_uploads";

  const messages = useMemo(() => {
    if (!selectedConversation) return [];
    const all = Array.isArray(userData?.messages) ? userData.messages! : [];
    const convMsgs = all.filter((m): m is DMMessage => !!m.conversationId && m.conversationId === selectedConversation);
    const filtered = convMsgs.filter(
      (m) =>
        !(
          deletedMessageIds.has(m.messageId || "") ||
          deletedMessageIds.has(m.optimisticId || "")
        )
    );
    return dedupeById(
      filtered.map((m) => ({ ...m, read: true } as DMMessage))
    ).sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  }, [userData, selectedConversation, deletedMessageIds]);

  const persistReadStatus = useCallback(async (conversationId: string) => {
    try {
      await apiFetch(MESSAGES_THREADS_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData.userId,
          conversationId,
          read: true,
        }),
      });
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "markRead",
            conversationType: "dm",
            conversationId,
            userId: userData.userId,
            read: true,
          })
        );
      }
    } catch (err) {
      console.error("Failed to mark conversation read", err);
    }
  }, [userData.userId, ws]);

  const markConversationAsRead = useCallback((conversationId: string) => {
    setUserData((prev) => {
      if (!prev || !Array.isArray(prev.messages)) return prev;
      const updated = prev.messages.map((m) =>
        m.conversationId === conversationId ? { ...m, read: true } : m
      );
      return { ...(prev as AppUser), messages: updated };
    });
    setDmReadStatus((prev) => ({
      ...prev,
      [conversationId]: new Date().toISOString(),
    }));
    persistReadStatus(conversationId);
  }, [setUserData, setDmReadStatus, persistReadStatus]);

  const openConversation = async (conversationId: string) => {
    const [a, b] = conversationId.replace("dm#", "").split("___");
    const otherId = a === userData.userId ? b : a;
    const otherUser = allUsers.find((u) => u.userId === otherId);
    const slug = otherUser ? slugify(`${otherUser.firstName}-${otherUser.lastName}`) : otherId;
    navigate(`/dashboard/messages/${slug}`);

    setSelectedConversation(conversationId);
    if (isMobile) setShowConversation(true);

    // mark read locally
    setDmThreads((prev) =>
      prev.map((t) => (t.conversationId === conversationId ? { ...t, read: true } : t))
    );
    markConversationAsRead(conversationId);
  };

  const handleMarkRead = (conversationId: string | null) => {
    if (!conversationId) return;
    setDmThreads((prev) =>
      prev.map((t) => (t.conversationId === conversationId ? { ...t, read: true } : t))
    );
    markConversationAsRead(conversationId);
  };

  const openPreviewModal = (file: DMFile) => {
    setSelectedPreviewFile(file);
    setPreviewModalOpen(true);
  };
  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    setSelectedPreviewFile(null);
  };

  // Filter who you can DM
  const filteredDMUsers = useMemo(
    () =>
      allUsers.filter((u) => {
        if (u.userId === userData.userId) return false;
        if (isCurrentUserAdmin) return true;
        return (
          (userData.collaborators && userData.collaborators.includes(u.userId)) ||
          ((u.role || "").toLowerCase() === "admin")
        );
      }),
    [allUsers, userData, isCurrentUserAdmin]
  );

  const selectedConversationRef = useRef<string | null>(selectedConversation);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    setActiveDmConversationId(selectedConversation);
    return () => setActiveDmConversationId(null);
  }, [selectedConversation, setActiveDmConversationId]);

  // Navigate to initial user (slug) if provided
  useEffect(() => {
    if (initialUserSlug && userData) {
      const user = findUserBySlug(allUsers, initialUserSlug);
      if (user) {
        const sortedIds = [userData.userId, user.userId].sort();
        const conversationId = `dm#${sortedIds.join("___")}`;
        setSelectedConversation(conversationId);
        if (isMobile) setShowConversation(true);
      }
    }
  }, [initialUserSlug, userData, allUsers, isMobile]);

  // Inform server about active conversation
  useEffect(() => {
    if (!ws || !selectedConversation) return;
    const payload = JSON.stringify({
      action: "setActiveConversation",
      conversationId: selectedConversation,
    });
    const sendWhenReady = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      } else {
        const onOpen = () => {
          ws.send(payload);
          ws.removeEventListener("open", onOpen);
        };
        ws.addEventListener("open", onOpen);
      }
    };
    sendWhenReady();
  }, [ws, selectedConversation]);

  // Fetch messages on conversation change (resilient apiFetch)
  useEffect(() => {
    if (!selectedConversation || !isAuthenticated) {
      if (!selectedConversation) setIsLoading(false);
      return;
    }

    const cached = getWithTTL(msgKey(selectedConversation));
    if (cached) {
      setUserData((prev) => {
        const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
        const others = prevMsgs.filter((m) => m.conversationId !== selectedConversation);
        return { ...prev, messages: dedupeById([...others, ...(cached as DMMessage[])]) };
      });
    }

const fetchMessages = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const data = await apiFetch<
          DMMessage[] | { messages?: DMMessage[] } | { Items?: DMMessage[] } | { items?: DMMessage[] }
        >(
          `${MESSAGES_THREADS_URL}/${encodeURIComponent(selectedConversation)}/messages`
        );

        const arr = Array.isArray(data)
          ? data
          : Array.isArray((data as { messages?: DMMessage[] }).messages)
          ? (data as { messages?: DMMessage[] }).messages!
          : Array.isArray((data as { Items?: DMMessage[] }).Items)
          ? (data as { Items?: DMMessage[] }).Items!
          : Array.isArray((data as { items?: DMMessage[] }).items)
          ? (data as { items?: DMMessage[] }).items!
          : [];

        if (!Array.isArray(arr)) {
          console.warn("Unexpected DM payload:", data);
          return;
        }

        const readData = arr
          .filter(
            (m) =>
              !(
                deletedMessageIds.has(m.messageId || "") ||
                deletedMessageIds.has(m.optimisticId || "")
              )
          )
          .map((m) => ({ ...m, read: true }));
        const uniqueData = dedupeById(readData);
        setWithTTL(msgKey(selectedConversation), uniqueData);

        setUserData((prev) => {
          const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
          const others = prevMsgs.filter((m) => m.conversationId !== selectedConversation);
          const merged = mergeAndDedupeMessages(others, uniqueData);
          return { ...prev, messages: merged };
        });

        markConversationAsRead(selectedConversation);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setErrorMessage("Failed to load messages.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversation, isAuthenticated, deletedMessageIds, setUserData, markConversationAsRead]);

  // Scroll management
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const initialScrollRef = useRef(true);

  useEffect(() => {
    if (initialScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      initialScrollRef.current = false;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    initialScrollRef.current = true;
  }, [selectedConversation]);

  // persist cache on change
  useEffect(() => {
    if (selectedConversation) {
      setWithTTL(msgKey(selectedConversation), messages);
    }
  }, [messages, selectedConversation]);

  // keep input visible on resize
  useEffect(() => {
    const handleResize = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Send message (optimistic)
  const sendMessage = () => {
    if (!selectedConversation || !newMessage.trim()) return;

    const timestamp = new Date().toISOString();
    const optimisticId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const messageData = {
      action: "sendMessage",
      conversationType: "dm",
      conversationId: selectedConversation,
      senderId: userData?.userId,
      text: newMessage,
      timestamp,
      optimisticId,
    };

    const optimisticMessage: DMMessage = {
      conversationId: selectedConversation,
      senderId: userData?.userId || "",
      text: newMessage,
      timestamp,
      optimisticId,
      optimistic: true,
    };

    setUserData((prev) => {
      const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
      return {
        ...prev,
        messages: mergeAndDedupeMessages(prevMsgs, [optimisticMessage]),
      };
    });

    const maxAttempts = 5;
    const trySendMessage = (attempts = 0) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        if (ws && ws.readyState !== WebSocket.OPEN) {
          try {
            ws.close();
          } catch {
            // Ignore errors when closing WebSocket
          }
        }
        if (attempts < maxAttempts) {
          setTimeout(() => trySendMessage(attempts + 1), 1000);
        } else {
          console.error("Failed to send message: WebSocket did not open.");
        }
        return;
      }

      try {
        ws.send(JSON.stringify(normalizeMessage(messageData, "sendMessage")));
        const [a, b] = selectedConversation.replace("dm#", "").split("___");
        const recipientId = a === userData.userId ? b : a;

        if (MESSAGES_THREADS_URL) {
          apiFetch(MESSAGES_THREADS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: selectedConversation,
              senderId: userData.userId,
              recipientId,
              snippet: newMessage,
              timestamp,
            }),
          }).catch((err) => console.error("Thread update failed:", err));
        }

        // update thread list
        setDmThreads((prev) => {
          const idx = prev.findIndex((t) => t.conversationId === selectedConversation);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              snippet: newMessage,
              lastMsgTs: timestamp,
              read: true,
            };
            return updated;
          }
          return [
            ...prev,
            {
              conversationId: selectedConversation,
              snippet: newMessage,
              lastMsgTs: timestamp,
              read: true,
              otherUserId: recipientId,
            },
          ];
        });

        setNewMessage("");
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
      }
    };

    trySendMessage();
  };

  // File drop & upload
  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (!files.length || !selectedConversation) return;

    for (const file of files) {
      const tempUrl = URL.createObjectURL(file);
      const optimisticId = `${Date.now()}-${file.name}`;
      const timestamp = new Date().toISOString();

      const websocketMessage = {
        action: "sendMessage",
        conversationType: "dm",
        conversationId: selectedConversation,
        senderId: userData?.userId,
        text: tempUrl,
        timestamp,
        optimisticId,
      };

      const optimisticMessage: DMMessage = {
        conversationId: selectedConversation,
        senderId: userData?.userId || "",
        text: tempUrl,
        file: { fileName: file.name, url: tempUrl, finalUrl: null },
        attachments: [{ fileName: file.name, url: tempUrl }],
        timestamp,
        optimisticId,
        optimistic: true,
      };

      setUserData((prev) => {
        const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
        return {
          ...prev,
          messages: mergeAndDedupeMessages(prevMsgs, [optimisticMessage]),
        };
      });

      try {
        const uploadedFile = await handleFileUpload(selectedConversation, file);
        if (!uploadedFile) throw new Error("File upload failed");

        // replace optimistic
        setUserData((prev) => {
          const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
          const updated = prevMsgs.map((msg) =>
            msg.optimisticId === optimisticId
              ? {
                  ...msg,
                  text: uploadedFile.url,
                  file: {
                    ...msg.file!,
                    url: uploadedFile.url,
                    finalUrl: uploadedFile.url,
                  },
                  optimistic: false,
                }
              : msg
          );
          return { ...(prev as AppUser), messages: updated };
        });

        // send via WS with retry logic
        const payload = {
          ...websocketMessage,
          text: uploadedFile.url,
          file: { fileName: file.name, url: uploadedFile.url },
          attachments: [{ fileName: file.name, url: uploadedFile.url }],
        };

        const maxAttempts = 5;
        const trySendFileMessage = (attempts = 0) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            if (ws && ws.readyState !== WebSocket.OPEN) {
              try {
                ws.close();
              } catch {
                // Ignore errors when closing WebSocket
              }
            }
            if (attempts < maxAttempts) {
              setTimeout(() => trySendFileMessage(attempts + 1), 1000);
            } else {
              console.error("Failed to send file message after", maxAttempts, "attempts.");
            }
            return;
          }
          try {
            ws.send(JSON.stringify(normalizeMessage(payload, "sendMessage")));
            console.log("✅ File message successfully sent!");
          } catch (error) {
            console.error("❌ Error sending file WebSocket message:", error);
          }
        };
        trySendFileMessage();

        // update thread list
        const [a, b] = selectedConversation.replace("dm#", "").split("___");
        const recipientId = a === userData.userId ? b : a;

        if (MESSAGES_THREADS_URL) {
          apiFetch(MESSAGES_THREADS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: selectedConversation,
              senderId: userData.userId,
              recipientId,
              snippet: uploadedFile.url,
              timestamp,
            }),
          }).catch((err) => console.error("Thread update failed:", err));
        }

        setDmThreads((prev) => {
          const idx = prev.findIndex((t) => t.conversationId === selectedConversation);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              snippet: uploadedFile.url,
              lastMsgTs: timestamp,
              read: true,
            };
            return updated;
          }
          return [
            ...prev,
            {
              conversationId: selectedConversation,
              snippet: uploadedFile.url,
              lastMsgTs: timestamp,
              read: true,
              otherUserId: recipientId,
            },
          ];
        });
      } catch (err) {
        console.error("File upload failed", err);
        setUserData((prev) => {
          const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
          return {
            ...prev,
            messages: prevMsgs.filter((m) => m.optimisticId !== optimisticId),
          };
        });
      } finally {
        URL.revokeObjectURL(tempUrl);
      }
    }
  };

  const handleFileUpload = async (
    conversationId: string,
    file: File
  ): Promise<DMFile | undefined> => {
    const filename = `dms/${conversationId}/${folderKey}/${file.name}`;
    try {
      const uploadTask = uploadData({
        key: filename,
        data: file,
        options: { accessLevel: "public" },
      });
      await uploadTask.result;
      // small delay for availability
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const fileUrl = `${S3_PUBLIC_BASE}/dms/${encodeURIComponent(
        conversationId
      )}/${folderKey}/${encodeURIComponent(file.name)}`;
      return { fileName: file.name, url: fileUrl };
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const deleteMessage = async (message: DMMessage) => {
    const id = message.messageId || message.optimisticId;
    if (!id || !selectedConversation) return;

    try {
      // delete file (if any)
      const fileUrl = message.file?.url ?? message.attachments?.[0]?.url;
      if (fileUrl) {
        try {
          await apiFetch(DELETE_FILE_FROM_S3_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: selectedConversation,
              field: folderKey,
              fileKeys: [fileUrl],
            }),
          });
        } catch (err) {
          console.error("Failed to delete file from S3", err);
        }
      }

 // delete from store/server (defensive for Response vs JSON)
      if (message.messageId) {
        const url = `${EDIT_MESSAGE_URL}/${encodeURIComponent(
          message.messageId
        )}?conversationId=${encodeURIComponent(selectedConversation)}`;
        const res = await apiFetch<{ success?: boolean }>(url, {
          method: "DELETE",
        });
        // Since apiFetch parses JSON and throws on error, res should be the success data
        console.log("Delete successful:", res);
      }

      const prevMsgs = Array.isArray(userData?.messages) ? userData.messages! : [];
      const updatedMsgs = prevMsgs.filter((m) => (m.messageId || m.optimisticId) !== id);
      setUserData((prev) => (prev ? { ...(prev as AppUser), messages: updatedMsgs } : prev));

      // track deletion locally
      markMessageDeleted(id);

      // recompute snippet
      const convoMsgs = updatedMsgs
        .filter((m) => m.conversationId === selectedConversation)
        .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
      const lastMsg = convoMsgs[0];
      const newSnippet = lastMsg?.text || "";
      const newTs = String(lastMsg?.timestamp || new Date().toISOString());

      setDmThreads((prev) =>
        prev.map((t) =>
          t.conversationId === selectedConversation
            ? { ...t, snippet: newSnippet, lastMsgTs: newTs, read: true }
            : t
        )
      );

      if (message.messageId) {
        const [a, b] = selectedConversation.replace("dm#", "").split("___");
        const recipientId = a === userData.userId ? b : a;
        if (MESSAGES_THREADS_URL) {
          await apiFetch(MESSAGES_THREADS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: selectedConversation,
              senderId: userData.userId,
              recipientId,
              snippet: newSnippet,
              timestamp: newTs,
              preserveRead: true,
            }),
          });
        }
      }

      if (ws && ws.readyState === WebSocket.OPEN && message.messageId) {
        const deletePayload = {
          action: "deleteMessage",
          conversationType: "dm" as const,
          conversationId: selectedConversation,
          messageId: message.messageId,
        };
        ws.send(JSON.stringify(normalizeMessage(deletePayload, "deleteMessage")));
      }
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  const editMessage = async (message: DMMessage, newText: string) => {
    if (!message.messageId || !newText || !selectedConversation) return;

    try {
      const res = await apiFetch<{ success?: boolean }>(
        `${EDIT_MESSAGE_URL}/${encodeURIComponent(message.messageId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: newText,
            editedBy: userData.userId,
            conversationId: selectedConversation,
          }),
        }
      );
      // Since apiFetch throws on error, success means we got here
      console.log("Edit successful:", res);

      const ts = new Date().toISOString();
      setUserData((prev) => {
        const msgs = Array.isArray(prev.messages) ? prev.messages : [];
        return {
          ...prev,
          messages: msgs.map((m) =>
            m.messageId === message.messageId
              ? { ...m, text: newText, edited: true, editedAt: ts }
              : m
          ),
        };
      });

      if (ws && ws.readyState === WebSocket.OPEN) {
        const editPayload = {
          action: "editMessage",
          conversationType: "dm" as const,
          conversationId: selectedConversation,
          messageId: message.messageId,
          text: newText,
          timestamp: message.timestamp,
          editedAt: ts,
          editedBy: userData.userId,
        };
        ws.send(JSON.stringify(normalizeMessage(editPayload, "editMessage")));
      }
    } catch (err) {
      console.error("Failed to edit message", err);
    }
  };

  const reactToMessage = (messageId: string, emoji: string) => {
    if (!messageId || !emoji || !selectedConversation) return;
    toggleReaction(messageId, emoji, userData.userId, selectedConversation, "dm", ws || undefined);
  };

  // Conversations list
  const dmConversations = filteredDMUsers.map((u) => {
    const sortedIds = [userData.userId, u.userId].sort();
    const conversationId = `dm#${sortedIds.join("___")}`;
    return {
      id: conversationId,
      title: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unnamed User",
      profilePicture: u.thumbnail || null,
    };
  });

  // Header title/icon
  let chatTitle = "Select a conversation";
  let chatIcon: React.ReactNode = null;
  if (selectedConversation) {
    const dmUser = dmConversations.find((u) => u.id === selectedConversation);
    if (dmUser) {
      chatTitle = `Direct Message / ${dmUser.title}`;
      chatIcon = dmUser.profilePicture ? (
        <img
          src={dmUser.profilePicture}
          alt={dmUser.title}
          style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <User style={{ width: 40, height: 40, opacity: 0.5 }} />
      );
    }
  }

  const listItemStyle: CSSProperties = {
    fontSize: "14px",
    padding: "10px",
    cursor: "pointer",
    borderRadius: "5px",
    marginBottom: "1px",
    transition: "0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  };

  return (
    <div
      className="messages-container"
      style={{ display: isMobile ? "block" : "flex", height: "100%" }}
    >
      {/* Sidebar */}
      {(!isMobile || !showConversation) && (
        <div
          className="sidebar"
          style={{
            width: isMobile ? "100%" : "25%",
            borderRight: isMobile ? "none" : "1px solid #444",
            background: "#0c0c0c",
          }}
        >
          <div className="sidebar-section">
            <h3
              style={{
                fontSize: "18px",
                background: "linear-gradient(30deg, #181818, #0c0c0c)",
                padding: "15px",
                margin: 0,
              }}
            >
              # Direct Messages
            </h3>
            <div
              style={{
                maxHeight: isMobile ? "calc(100vh - 150px)" : "400px",
                overflowY: "auto",
              }}
            >
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {dmConversations.map((conv) => {
                  const onlinePeerId = conv.id
                    .replace("dm#", "")
                    .split("___")
                    .find((id) => id !== userData.userId);
                  const online = onlinePeerId ? isOnline(onlinePeerId) : false;

                  return (
                    <li
                      key={conv.id}
                      onClick={() => openConversation(conv.id)}
                      style={{
                        ...listItemStyle,
                        background: selectedConversation === conv.id ? "#252525" : undefined,
                        color: selectedConversation === conv.id ? "#fff" : "#bbb",
                        padding: "10px 15px",
                        position: "relative",
                      }}
                    >
                      <div className="avatar-wrapper" style={{ marginRight: 8 }}>
                        <>
                          {conv.profilePicture ? (
                            <img
                              src={conv.profilePicture}
                              alt={conv.title}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <User style={{ width: 32, height: 32, opacity: 0.5 }} />
                          )}
                          {online && <span className="online-indicator" />}
                        </>
                      </div>
                      <span style={{ flexGrow: 1, textAlign: "right" }}>{conv.title}</span>
                      {threadMap[conv.id] && (
                        <span
                          style={{
                            background: "#FA3356",
                            color: "#fff",
                            borderRadius: "12px",
                            padding: "2px 6px",
                            fontSize: "12px",
                            marginLeft: "4px",
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {(!isMobile || showConversation) && (
        <div
          className={`chat-window ${isDragging ? "dragging" : ""}`}
          style={{
            width: isMobile ? "100%" : "75%",
            display: "flex",
            flexDirection: "column",
            padding: "15px",
            position: "relative",
            height: "100%",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleDrop(e);
          }}
        >
          {isMobile && showConversation && (
            <button
              onClick={() => setShowConversation(false)}
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                background: "none",
                border: "none",
                color: "#fff",
                fontSize: "18px",
                zIndex: 10,
              }}
              aria-label="Back to conversations"
            >
              ←
            </button>
          )}

          {isLoading && <SpinnerOverlay />}
          {errorMessage && <div className="error-message">{errorMessage}</div>}

          <div
            className="chat-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "5px",
              marginBottom: "10px",
            }}
          >
            <h2 style={{ fontSize: 18 }}>{chatTitle}</h2>
            {chatIcon}
          </div>

          <div
            className="chat-messages"
            style={{
              flexGrow: 1,
              overflowY: isLoading ? "hidden" : "auto",
              padding: "10px",
              background: "#222",
              borderRadius: "5px",
              marginBottom: "10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: messages.length === 0 ? "center" : "flex-start",
              alignItems: messages.length === 0 ? "center" : "stretch",
            }}
            onClick={() => selectedConversation && handleMarkRead(selectedConversation)}
          >
            {messages.length === 0 && !isLoading ? (
              <div style={{ color: "#aaa", fontSize: 16, textAlign: "center" }}>
                No messages yet.
              </div>
            ) : (
              messages.map((msg, index) => (
                <MessageItem
                  key={msg.optimisticId || msg.messageId || String(msg.timestamp)}
                  msg={msg as ChatMessage}
                  prevMsg={messages[index - 1] as ChatMessage}
                  userData={userData}
                  allUsers={allUsers}
                  openPreviewModal={openPreviewModal}
                  folderKey={folderKey}
                  renderFilePreview={renderFilePreview}
                  getFileNameFromUrl={getFileNameFromUrl}
                  onDelete={(m: ChatMessage) => setDeleteTarget(m as DMMessage)}
                  onEditRequest={(m: ChatMessage) => setEditTarget(m as DMMessage)}
                  onReact={reactToMessage}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative" }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onFocus={() => selectedConversation && handleMarkRead(selectedConversation)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              style={{
                flexGrow: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #444",
                background: "#1c1c1c",
                color: "#fff",
              }}
              aria-label="Message input"
            />
            <button
              onClick={() => setShowEmojiPicker((p) => !p)}
              style={{ background: "none", border: "none", cursor: "pointer" }}
              aria-label="Toggle emoji picker"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div
                style={{
                  position: "absolute",
                  bottom: 40,
                  right: 60,
                  background: "#333",
                  padding: 5,
                  borderRadius: 8,
                  display: "flex",
                  gap: 4,
                }}
              >
                {["😀", "😂", "👍", "❤️", "✅", "💯"].map((em) => (
                  <span
                    key={em}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setNewMessage((m) => m + em);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {em}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={sendMessage}
              style={{
                padding: "10px 15px",
                background: "#FA3356",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>

          {isDragging && <div className="drag-overlay">Drop files to upload</div>}

          {/* Preview Modal */}
          <Modal
            isOpen={isPreviewModalOpen}
            onRequestClose={closePreviewModal}
            contentLabel="File Preview Modal"
            className="messages-modal-content"
            overlayClassName="messages-modal-overlay"
          >
            {selectedPreviewFile && (
              <div className="preview-container">
                {(() => {
                  const ext = selectedPreviewFile.fileName.split(".").pop()?.toLowerCase() || "";
                  if (["jpg", "jpeg", "png"].includes(ext)) {
                    return (
                      <img
                        src={selectedPreviewFile.finalUrl || selectedPreviewFile.url}
                        alt={selectedPreviewFile.fileName}
                        style={{ maxWidth: "90vw", maxHeight: "80vh" }}
                      />
                    );
                  }
                  return renderFilePreview(selectedPreviewFile, folderKey);
                })()}
                <div className="preview-header">
                  <button onClick={closePreviewModal} className="modal-button secondary" aria-label="Close preview">
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                  <a href={selectedPreviewFile.url} download style={{ color: "white" }}>
                    <FontAwesomeIcon icon={faDownload} />
                  </a>
                </div>
              </div>
            )}
          </Modal>

          {/* Delete Confirm */}
          <ConfirmModal
            isOpen={!!deleteTarget}
            onRequestClose={() => setDeleteTarget(null)}
            onConfirm={() => {
              if (deleteTarget) deleteMessage(deleteTarget);
              setDeleteTarget(null);
            }}
            message="Delete this message?"
            className="messages-modal-content"
            overlayClassName="messages-modal-overlay"
          />

          {/* Edit Prompt */}
          <PromptModal
            isOpen={!!editTarget}
            onRequestClose={() => setEditTarget(null)}
            onSubmit={(text) => {
              if (editTarget) editMessage(editTarget, text);
              setEditTarget(null);
            }}
            message="Edit message"
            defaultValue={editTarget?.text || ""}
            className="messages-modal-content"
            overlayClassName="messages-modal-overlay"
          />
        </div>
      )}
    </div>
  );
};

export default Messages;
