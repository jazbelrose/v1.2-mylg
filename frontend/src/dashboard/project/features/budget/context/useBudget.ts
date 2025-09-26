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
  headers: BudgetHeader[];
}

// In-memory cache and in-flight trackers keyed by projectId
const budgetCache = new Map<string, BudgetData>();
const inflight = new Map<string, Promise<BudgetData>>();

const cacheKey = (projectId: string, revision: number | null): string =>
  `${projectId || "__none__"}::${revision != null ? revision : "__default__"}`;

const normalizeRevision = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

async function fetchData(
  projectId: string,
  revision: number | null,
  force = false,
): Promise<BudgetData> {
  if (!projectId) return { header: null, items: [], headers: [] };

  const key = cacheKey(projectId, revision);

  if (!force && budgetCache.has(key)) {
    return budgetCache.get(key)!;
  }

  if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  const promise = (async () => {
    const maxAttempts = 3;
    let attempt = 0;
    let delay = 500;
    // Simple exponential backoff for 429 errors
    while (true) {
      try {
        const headers = await fetchBudgetHeaders(projectId);
        let selected: BudgetHeader | null = null;
        if (revision != null) {
          selected = headers.find((h) => Number(h.revision ?? NaN) === revision) || null;
        }
        if (!selected) {
          const client = headers.find(
            (h) => h.clientRevisionId != null && h.clientRevisionId === h.revision,
          );
          selected = client || headers[0] || null;
        }

        let items: BudgetItem[] = [];
        if (selected?.budgetId) {
          items = await fetchBudgetItems(selected.budgetId, selected.revision);
        }
        const result: BudgetData = { header: selected, items, headers };
        budgetCache.set(key, result);
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

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/**
 * Pre-load budget data for a project into the cache without updating any
 * component state. This allows subsequent calls to the hook to render
 * immediately with cached data.
 */
export async function prefetchBudgetData(projectId: string, revision?: number | null): Promise<void> {
  if (!projectId) return;
  const normalizedRevision = revision != null && !Number.isNaN(revision) ? revision : null;
  const key = cacheKey(projectId, normalizedRevision);
  if (budgetCache.has(key)) return;
  try {
    await fetchData(projectId, normalizedRevision);
  } catch (err) {
    console.error("Error prefetching budget data", err);
  }
}

interface UseBudgetDataOptions {
  revision?: number | null;
}

export default function useBudgetData(
  projectId: string | undefined,
  options: UseBudgetDataOptions = {},
) {
  const normalizedRevision =
    options.revision != null && !Number.isNaN(options.revision)
      ? Number(options.revision)
      : null;
  const cached = projectId ? budgetCache.get(cacheKey(projectId, normalizedRevision)) : null;
  const [budgetHeader, setBudgetHeader] = useState<BudgetHeader | null>(
    cached ? cached.header : null,
  );
  const [budgetItems, setBudgetItemsState] = useState<BudgetItem[]>(
    cached ? cached.items : [],
  );
  const [headers, setHeaders] = useState<BudgetHeader[]>(cached ? cached.headers : []);
  const [loading, setLoading] = useState(!cached);
  const initialRevision = normalizeRevision(cached?.header?.revision) ?? normalizedRevision ?? null;
  const currentRevisionRef = useRef<number | null>(initialRevision);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!projectId) {
        setBudgetHeader(null);
        setBudgetItemsState([]);
        setHeaders([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { header, items, headers: allHeaders } = await fetchData(projectId, normalizedRevision);
        if (!ignore) {
          setBudgetHeader((prev) =>
            shallowEqualObjects(prev, header) ? prev : header,
          );
          setBudgetItemsState((prev) =>
            shallowEqualArrays(prev, items) ? prev : items,
          );
          setHeaders(allHeaders);
          currentRevisionRef.current = normalizeRevision(header?.revision);
        }
      } catch (err) {
        console.error("Error fetching budget data", err);
        if (!ignore) {
          setBudgetHeader(null);
          setBudgetItemsState([]);
          setHeaders([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [projectId, normalizedRevision]);

  const refresh = useCallback(async () => {
    if (!projectId) return null;
    setLoading(true);
    try {
      const data = await fetchData(projectId, normalizedRevision, true);
      setBudgetHeader((prev) =>
        shallowEqualObjects(prev, data.header) ? prev : data.header,
      );
      setBudgetItemsState((prev) =>
        shallowEqualArrays(prev, data.items) ? prev : data.items,
      );
      setHeaders(data.headers);
      currentRevisionRef.current = normalizeRevision(data.header?.revision) ?? currentRevisionRef.current;
      return data;
    } catch (err) {
      console.error("Error refreshing budget data", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId, normalizedRevision]);

  const setBudgetItems = useCallback(
    (items: BudgetItem[]) => {
      if (!projectId) return;
      setBudgetItemsState((prev) =>
        shallowEqualArrays(prev, items) ? prev : items,
      );
      const key = cacheKey(projectId, currentRevisionRef.current ?? normalizedRevision ?? null);
      const cachedEntry = budgetCache.get(key) || {
        header: null as BudgetHeader | null,
        items: [] as BudgetItem[],
        headers: [] as BudgetHeader[],
      };
      budgetCache.set(key, { header: cachedEntry.header, items, headers: cachedEntry.headers });
    },
    [projectId, normalizedRevision],
  );

  const updateBudgetHeader = useCallback(
    (headerOrUpdater: BudgetHeader | ((prev: BudgetHeader | null) => BudgetHeader)) => {
      if (!projectId) return;
      setBudgetHeader((prev) => {
        const next =
          typeof headerOrUpdater === "function"
            ? (headerOrUpdater as (p: BudgetHeader | null) => BudgetHeader)(prev)
            : headerOrUpdater;
        if (shallowEqualObjects(prev, next)) return prev;
        const key = cacheKey(projectId, currentRevisionRef.current ?? normalizedRevision ?? null);
        const cachedEntry = budgetCache.get(key) || {
          header: null as BudgetHeader | null,
          items: [] as BudgetItem[],
          headers: [] as BudgetHeader[],
        };
        budgetCache.set(key, { header: next, items: cachedEntry.items, headers: cachedEntry.headers });
        currentRevisionRef.current = normalizeRevision(next?.revision) ?? currentRevisionRef.current;
        return next;
      });
    },
    [projectId, normalizedRevision],
  );

  return {
    budgetHeader,
    budgetItems,
    setBudgetHeader: updateBudgetHeader,
    setBudgetItems,
    refresh,
    loading,
    headers,
  };
}










