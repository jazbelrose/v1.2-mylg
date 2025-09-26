import React, {
  PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import useBudgetData from "@/dashboard/project/features/budget/context/useBudget";
import { useSocket } from "@/app/contexts/useSocket";
import { useData } from "@/app/contexts/useData";
import { normalizeMessage } from "@/shared/utils/websocketUtils";
import { BudgetContext } from "./BudgetContext";
import type { BudgetStats, PieDataItem, BudgetWebSocketOperations } from "./types";

interface ProviderProps extends PropsWithChildren {
  projectId?: string;
}

export const BudgetProvider: React.FC<ProviderProps> = ({ projectId, children }) => {
  const {
    budgetHeader,
    budgetItems,
    setBudgetHeader,
    setBudgetItems,
    refresh,
    loading,
  } = useBudgetData(projectId);
  const { ws } = useSocket();
  const { user, userId } = useData();

  const refreshRef = useRef(refresh);
  const lockedLinesRef = useRef<string[]>([]);
  const activeRevisionRef = useRef<number | null>(null);
  const manualRevisionRef = useRef(false);
  
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const revision = Number((budgetHeader as Record<string, unknown>)?.revision ?? NaN);
    activeRevisionRef.current = Number.isNaN(revision) ? null : revision;
  }, [budgetHeader]);

  const setManualRevision = useCallback((manual: boolean) => {
    manualRevisionRef.current = manual;
  }, []);

  // WebSocket operations - centralized here
  const emitBudgetUpdate = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !projectId || !budgetHeader) return;
    ws.send(
      JSON.stringify({
        action: 'budgetUpdated',
        projectId,
        title: budgetHeader.projectTitle || 'Budget Updated',
        revision: budgetHeader.revision,
        total: budgetHeader.headerFinalTotalCost,
        conversationId: `project#${projectId}`,
        username: user?.firstName || 'Someone',
        senderId: userId,
      })
    );
  }, [ws, projectId, budgetHeader, user, userId]);

  const emitLineLock = useCallback((lineId: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !projectId || !budgetHeader) return;
    ws.send(
      JSON.stringify({
        action: 'lineLocked',
        projectId,
        lineId,
        revision: budgetHeader.revision,
        conversationId: `project#${projectId}`,
        username: user?.firstName || 'Someone',
        senderId: userId,
      })
    );
  }, [ws, projectId, budgetHeader, user, userId]);

  const emitLineUnlock = useCallback((lineId: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !projectId || !budgetHeader) return;
    ws.send(
      JSON.stringify({
        action: 'lineUnlocked',
        projectId,
        lineId,
        revision: budgetHeader.revision,
        conversationId: `project#${projectId}`,
        username: user?.firstName || 'Someone',
        senderId: userId,
      })
    );
  }, [ws, projectId, budgetHeader, user, userId]);

  const emitTimelineUpdate = useCallback((events: unknown[]) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !projectId) return;
    ws.send(
      JSON.stringify(
        normalizeMessage(
          {
            action: 'timelineUpdated',
            projectId,
            title: budgetHeader?.projectTitle || 'Timeline Updated',
            events,
            conversationId: `project#${projectId}`,
            username: user?.firstName || 'Someone',
            senderId: userId,
          },
          'timelineUpdated'
        )
      )
    );
  }, [ws, projectId, budgetHeader, user, userId]);

  const emitClientRevisionUpdate = useCallback(
    (clientRevisionId: number | null, previousClientRevisionId: number | null) => {
      if (!ws || ws.readyState !== WebSocket.OPEN || !projectId) return;
      ws.send(
        JSON.stringify({
          action: 'clientRevisionUpdated',
          projectId,
          clientRevisionId,
          previousClientRevisionId,
          conversationId: `project#${projectId}`,
          username: user?.firstName || 'Someone',
          senderId: userId,
        }),
      );
    },
    [projectId, user?.firstName, userId, ws],
  );

  // Memoized selectors with deep equality
  const getStats = useCallback((): BudgetStats => {
    if (!budgetHeader) {
      return {
        ballpark: 0,
        budgetedCost: 0,
        actualCost: 0,
        finalCost: 0,
        effectiveMarkup: 0,
      };
    }

    const hasFinalCost = budgetItems.some(item => 
      item.itemFinalCost !== undefined && item.itemFinalCost !== null
    );

    return {
      ballpark: hasFinalCost 
        ? Number(budgetHeader.headerFinalTotalCost ?? 0)
        : Number(budgetHeader.headerBallPark ?? 0),
      budgetedCost: Number(budgetHeader.headerBudgetedTotalCost ?? 0),
      actualCost: Number(budgetHeader.headerActualTotalCost ?? 0),
      finalCost: Number(budgetHeader.headerFinalTotalCost ?? 0),
      effectiveMarkup: Number(budgetHeader.headerEffectiveMarkup ?? 0),
    };
  }, [budgetHeader, budgetItems]);

  const getPie = useCallback((groupBy: string = "invoiceGroup"): PieDataItem[] => {
    if (!budgetHeader) return [];

    const stats = getStats();
    
    if (groupBy === "none") {
      return [
        { name: "Ballpark", value: stats.ballpark },
        { name: "Budgeted Cost", value: stats.budgetedCost },
        { name: "Actual Cost", value: stats.actualCost },
        { name: "Effective Markup", value: stats.effectiveMarkup * 100 },
        { name: "Final Cost", value: stats.finalCost },
      ].filter(item => item.value > 0);
    }

    const hasFinalCost = budgetItems.some(
      item => item.itemFinalCost !== undefined && item.itemFinalCost !== null
    );

    if (!hasFinalCost) {
      return [{ name: "Ballpark", value: stats.ballpark }];
    }

    const totals: Record<string, number> = {};
    for (const item of budgetItems) {
      const rawKey = (item as Record<string, unknown>)[groupBy];
      const key = rawKey && String(rawKey).trim() !== "" ? String(rawKey) : "Unspecified";
      const val = Number(item.itemFinalCost ?? 0) || 0;
      totals[key] = (totals[key] ?? 0) + val;
    }

    const entries = Object.entries(totals);
    if (entries.length === 1 && entries[0][0] === "Unspecified") {
      return [{ name: "Final Cost", value: entries[0][1] }];
    }
    
    return entries
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [budgetHeader, budgetItems, getStats]);

  const getRows = useCallback((): Record<string, unknown>[] => {
    return budgetItems as unknown as Record<string, unknown>[];
  }, [budgetItems]);

  const getLocks = useCallback((): string[] => {
    return lockedLinesRef.current;
  }, []);

  // WebSocket operations object
  const wsOps = useMemo(
    (): BudgetWebSocketOperations => ({
      emitBudgetUpdate,
      emitLineLock,
      emitLineUnlock,
      emitTimelineUpdate,
      emitClientRevisionUpdate,
    }),
    [emitBudgetUpdate, emitLineLock, emitLineUnlock, emitTimelineUpdate, emitClientRevisionUpdate],
  );

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
        return;
      }

      // Early return for non-budget messages to prevent unnecessary processing
      if (!data || typeof data !== "object" || !projectId) {
        return;
      }

      const messageData = data as Record<string, unknown>;
      
      // Gate messages: only process budget-related actions for the current project
      if (messageData.projectId !== projectId) {
        return;
      }
      
      const parseRevision = (value: unknown): number | null => {
        if (typeof value === "number" && !Number.isNaN(value)) return value;
        if (typeof value === "string") {
          const parsed = Number(value);
          return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
      };

      const messageRevision = parseRevision(messageData.revision);
      const currentRevision = activeRevisionRef.current;
      const shouldProcessRevisionScoped =
        messageRevision == null ||
        currentRevision == null ||
        Number(messageRevision) === Number(currentRevision);

      // Handle budgetUpdated messages
      if (messageData.action === "budgetUpdated") {
        if (!shouldProcessRevisionScoped) {
          return;
        }
        refreshRef.current();
        return;
      }

      // Handle lineLocked messages - update internal state and dispatch window events
      if (messageData.action === "lineLocked" || messageData.action === "lockLineUpdated") {
        if (!shouldProcessRevisionScoped) {
          return;
        }
        if (messageData.senderId !== userId) {
          const lineId = messageData.lineId as string;
          if (lineId) {
            lockedLinesRef.current = lockedLinesRef.current.includes(lineId)
              ? lockedLinesRef.current
              : [...lockedLinesRef.current, lineId];
          }
        }
        window.dispatchEvent(new CustomEvent("lineLocked", { detail: data }));
        return;
      }

      // Handle lineUnlocked messages - update internal state and dispatch window events
      if (messageData.action === "lineUnlocked") {
        if (!shouldProcessRevisionScoped) {
          return;
        }
        if (messageData.senderId !== userId) {
          const lineId = messageData.lineId as string;
          if (lineId) {
            lockedLinesRef.current = lockedLinesRef.current.filter(id => id !== lineId);
          }
        }
        window.dispatchEvent(new CustomEvent("lineUnlocked", { detail: data }));
        return;
      }

      if (messageData.action === "clientRevisionUpdated") {
        const clientRevision = parseRevision(messageData.clientRevisionId);
        const previousClientRevision = parseRevision(
          messageData.previousClientRevisionId,
        );

        setBudgetHeader((prev) => {
          if (!prev) return prev;
          const nextClientRevision = clientRevision ?? null;
          if ((prev as Record<string, unknown>).clientRevisionId === nextClientRevision) {
            return prev;
          }
          return {
            ...(prev as Record<string, unknown>),
            clientRevisionId: nextClientRevision,
          } as typeof prev;
        });

        window.dispatchEvent(
          new CustomEvent("clientRevisionUpdated", { detail: data }),
        );

        const shouldAutoSwitch =
          !manualRevisionRef.current &&
          previousClientRevision != null &&
          currentRevision != null &&
          Number(previousClientRevision) === Number(currentRevision);

        const noPreviousClient =
          !manualRevisionRef.current && previousClientRevision == null;

        if (shouldAutoSwitch || noPreviousClient || (!manualRevisionRef.current && currentRevision == null)) {
          refreshRef.current(clientRevision ?? null);
        }

        return;
      }
    };

    ws.addEventListener("message", handleMessage);
    
    const handleWindow = (e: Event) => {
      const detail = (e as CustomEvent).detail as { projectId?: string } | undefined;
      if (detail?.projectId === projectId) {
        refreshRef.current();
      }
    };
    
    window.addEventListener("budgetUpdated", handleWindow as EventListener);
    return () => {
      ws.removeEventListener("message", handleMessage);
      window.removeEventListener("budgetUpdated", handleWindow as EventListener);
    };
  }, [ws, projectId, userId]);

  const value = useMemo(
    () => ({
      budgetHeader,
      budgetItems,
      setBudgetHeader,
      setBudgetItems,
      refresh,
      loading,
      getStats,
      getPie,
      getRows,
      getLocks,
      wsOps,
      setManualRevision,
    }),
    [
      budgetHeader,
      budgetItems,
      setBudgetHeader,
      setBudgetItems,
      refresh,
      loading,
      getStats,
      getPie,
      getRows,
      getLocks,
      wsOps,
      setManualRevision,
    ]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export default BudgetProvider;












