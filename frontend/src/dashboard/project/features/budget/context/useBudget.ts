import { useState, useEffect, useCallback, useRef } from "react";
import { fetchBudgetHeaders, fetchBudgetItems } from "@/shared/utils/api";

function shallowEqualObjects(
  a: Record<string, unknown> | null,
  b: Record<string, unknown> | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function shallowEqualArrays(a: unknown[], b: unknown[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

type BudgetHeader = Record<string, unknown>;
type BudgetItem = Record<string, unknown>;

interface BudgetData {
  header: BudgetHeader | null;
  items: BudgetItem[];
}

// In-memory cache and in-flight trackers keyed by projectId
const budgetCache = new Map<string, BudgetData>();
const inflight = new Map<string, Promise<BudgetData>>();

type FetchOptions = {
  force?: boolean;
  preferredRevision?: number | null;
};

const buildFetchKey = (projectId: string, revision: number | null): string =>
  `${projectId}::${revision ?? "default"}`;

async function fetchData(
  projectId: string,
  options: FetchOptions = {},
): Promise<BudgetData> {
  if (!projectId) return { header: null, items: [] };

  const { force = false, preferredRevision = null } = options;
  const cached = budgetCache.get(projectId);
  const cachedRevision = Number(cached?.header?.revision ?? NaN);

  if (
    !force &&
    cached &&
    (preferredRevision == null || preferredRevision === cachedRevision)
  ) {
    return cached;
  }

  const fetchKey = buildFetchKey(projectId, preferredRevision);

  if (!force && inflight.has(fetchKey)) {
    return inflight.get(fetchKey)!;
  }

  const promise = (async () => {
    const maxAttempts = 3;
    let attempt = 0;
    let delay = 500;
    // Simple exponential backoff for 429 errors
    while (true) {
      try {
        const headers = await fetchBudgetHeaders(projectId);

        let header: BudgetHeader | null = null;
        if (preferredRevision != null) {
          header = headers.find(
            (candidate) =>
              Number(candidate?.revision ?? NaN) === preferredRevision,
          ) ?? null;
        }

        if (!header) {
          header =
            headers.find(
              (candidate) =>
                candidate?.clientRevisionId != null &&
                Number(candidate.clientRevisionId) ===
                  Number(candidate.revision ?? NaN),
            ) ?? headers[0] ?? null;
        }

        let items: BudgetItem[] = [];
        if (header?.budgetId) {
          items = await fetchBudgetItems(header.budgetId, header.revision);
        }
        const result: BudgetData = { header, items };
        budgetCache.set(projectId, result);
        return result;
      } catch (err: unknown) {
        const msg = String((err as { message?: string })?.message || "");
        if (msg.includes("429") && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt += 1;
          delay *= 2;
          continue;
        }
        throw err;
      }
    }
  })();

  inflight.set(fetchKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(fetchKey);
  }
}

/**
 * Pre-load budget data for a project into the cache without updating any
 * component state. This allows subsequent calls to the hook to render
 * immediately with cached data.
 */
export async function prefetchBudgetData(projectId: string): Promise<void> {
  if (!projectId || budgetCache.has(projectId)) return;
  try {
    await fetchData(projectId);
  } catch (err) {
    console.error("Error prefetching budget data", err);
  }
}

export default function useBudgetData(projectId: string | undefined) {
  const cached = projectId ? budgetCache.get(projectId) : null;
  const [budgetHeader, setBudgetHeaderState] = useState<BudgetHeader | null>(
    cached ? cached.header : null,
  );
  const [budgetItems, setBudgetItemsState] = useState<BudgetItem[]>(
    cached ? cached.items : [],
  );
  const [loading, setLoading] = useState(!cached);
  const initialRevisionValue = (() => {
    if (!cached?.header) return null;
    const raw = (cached.header as Record<string, unknown>).revision;
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  })();
  const activeRevisionRef = useRef<number | null>(initialRevisionValue);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!projectId) {
        setBudgetHeader(null);
        setBudgetItemsState([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { header, items } = await fetchData(projectId, {
          preferredRevision: activeRevisionRef.current,
        });
        if (!ignore) {
          setBudgetHeaderState((prev) => {
            if (shallowEqualObjects(prev, header)) return prev;
            const revision =
              header && header?.revision != null
                ? Number((header as Record<string, unknown>).revision as number)
                : null;
            activeRevisionRef.current = Number.isNaN(revision)
              ? null
              : revision;
            return header;
          });
          setBudgetItemsState((prev) =>
            shallowEqualArrays(prev, items) ? prev : items,
          );
        }
      } catch (err) {
        console.error("Error fetching budget data", err);
        if (!ignore) {
          setBudgetHeaderState(() => {
            activeRevisionRef.current = null;
            return null;
          });
          setBudgetItemsState([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [projectId]);

  const refresh = useCallback(
    async (preferredRevision?: number | null) => {
      if (!projectId) return null;
      setLoading(true);
      try {
        if (preferredRevision != null && !Number.isNaN(preferredRevision)) {
          activeRevisionRef.current = preferredRevision;
        }
        const data = await fetchData(projectId, {
          force: true,
          preferredRevision:
            preferredRevision != null && !Number.isNaN(preferredRevision)
              ? preferredRevision
              : activeRevisionRef.current,
        });
        setBudgetHeaderState((prev) => {
          if (shallowEqualObjects(prev, data.header)) return prev;
          const revision =
            data.header && data.header?.revision != null
              ? Number(
                  (data.header as Record<string, unknown>).revision as number,
                )
              : null;
          activeRevisionRef.current = Number.isNaN(revision)
            ? null
            : revision;
          return data.header;
        });
        setBudgetItemsState((prev) =>
          shallowEqualArrays(prev, data.items) ? prev : data.items,
        );
        return data;
      } catch (err) {
        console.error("Error refreshing budget data", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  const setBudgetItems = useCallback(
    (items: BudgetItem[]) => {
      if (!projectId) return;
      setBudgetItemsState((prev) =>
        shallowEqualArrays(prev, items) ? prev : items,
      );
      const cached = budgetCache.get(projectId) || {
        header: null,
        items: [] as BudgetItem[],
      };
      budgetCache.set(projectId, { header: cached.header, items });
    },
    [projectId],
  );

  const updateBudgetHeader = useCallback(
    (
      headerOrUpdater:
        | BudgetHeader
        | null
        | ((prev: BudgetHeader | null) => BudgetHeader | null),
    ) => {
      if (!projectId) return;
      setBudgetHeaderState((prev) => {
        const next =
          typeof headerOrUpdater === "function"
            ? (headerOrUpdater as (p: BudgetHeader | null) => BudgetHeader | null)(prev)
            : headerOrUpdater;
        const nextRevision =
          next && next?.revision != null
            ? Number((next as Record<string, unknown>).revision as number)
            : null;
        activeRevisionRef.current = Number.isNaN(nextRevision)
          ? null
          : nextRevision;
        if (shallowEqualObjects(prev, next)) return prev;
        const cached = budgetCache.get(projectId) || {
          header: null,
          items: [] as BudgetItem[],
        };
        budgetCache.set(projectId, { header: next, items: cached.items });
        return next;
      });
    },
    [projectId],
  );

  return {
    budgetHeader,
    budgetItems,
    setBudgetHeader: updateBudgetHeader,
    setBudgetItems,
    refresh,
    loading,
  };
}










