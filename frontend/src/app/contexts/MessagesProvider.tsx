// src/app/contexts/MessagesProvider.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  PropsWithChildren,
} from "react";
import { useAuth } from "./useAuth";
import { MESSAGES_INBOX_URL, apiFetch } from "../../shared/utils/api";
import { getWithTTL, setWithTTL, DEFAULT_TTL } from "../../shared/utils/storageWithTTL";
import { MessagesContext } from "./MessagesContext";
import type { MessagesValue, ProjectMessagesMap } from "./MessagesContextValue";
import type { Thread, Message } from "./DataProvider";

export const MessagesProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { userId } = useAuth();

  const [projectMessages, setProjectMessages] = useState<ProjectMessagesMap>({});
  const [dmThreads, setDmThreads] = useState<Thread[]>(() => {
    const stored = getWithTTL("dmThreads");
    return Array.isArray(stored) ? (stored as Thread[]) : [];
  });

  const deletedMessageIdsRef = useRef<Set<string>>(new Set());

  const markMessageDeleted = (id?: string) => {
    if (id) deletedMessageIdsRef.current.add(id);
  };

  const clearDeletedMessageId = (id?: string) => {
    if (id) deletedMessageIdsRef.current.delete(id);
  };

  const toggleReaction = (
    msgId: string,
    emoji: string,
    reactorId: string,
    conversationId: string,
    conversationType: "dm" | "project",
    ws?: WebSocket
  ) => {
    if (!msgId || !emoji || !reactorId) return;

    const updateArr = (arr: Message[] = []) =>
      arr.map((m) => {
        const id = m.messageId || m.optimisticId;
        if (id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = new Set(reactions[emoji] || []);
        if (users.has(reactorId)) {
          users.delete(reactorId);
        } else {
          users.add(reactorId);
        }
        reactions[emoji] = Array.from(users);
        return { ...m, reactions };
      });

    setProjectMessages((prev) => {
      const updated: ProjectMessagesMap = {};
      for (const pid of Object.keys(prev)) {
        const msgs = Array.isArray(prev[pid]) ? prev[pid] : [];
        updated[pid] = updateArr(msgs);
      }
      return updated;
    });

    if (ws && ws.readyState === WebSocket.OPEN && conversationId && conversationType) {
      ws.send(
        JSON.stringify({
          action: "toggleReaction",
          conversationType,
          conversationId,
          messageId: msgId,
          emoji,
          userId: reactorId,
        })
      );
    }
  };

  // Persist DM threads
  useEffect(() => {
    setWithTTL("dmThreads", dmThreads, DEFAULT_TTL);
  }, [dmThreads]);

  // Load DM threads
  useEffect(() => {
    if (!userId) return;
    const fetchThreads = async () => {
      try {
        const data = await apiFetch<Thread[] | unknown>(
          `${MESSAGES_INBOX_URL}?userId=${encodeURIComponent(userId)}`
        );
        setDmThreads(Array.isArray(data) ? (data as Thread[]) : []);
      } catch (err) {
        console.error("Failed to fetch threads", err);
      }
    };
    fetchThreads();
  }, [userId]);

  const messagesValue = useMemo<MessagesValue>(
    () => ({
      dmThreads,
      setDmThreads,
      projectMessages,
      setProjectMessages,
      deletedMessageIds: deletedMessageIdsRef.current,
      markMessageDeleted,
      clearDeletedMessageId,
      toggleReaction,
    }),
    [dmThreads, projectMessages]
  );

  return (
    <MessagesContext.Provider value={messagesValue}>
      {children}
    </MessagesContext.Provider>
  );
};