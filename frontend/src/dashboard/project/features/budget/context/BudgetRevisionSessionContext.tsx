import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type BudgetRevisionSessionValue = {
  budgetId: string | null;
  workingRevisionId: number | null;
  docVersion: number;
  hasUserOverride: boolean;
  setWorkingRevisionId: (revision: number | null, options?: { persist?: boolean; markOverride?: boolean }) => void;
  setDocVersion: (version: number, options?: { persist?: boolean }) => void;
  syncFromServerSnapshot: (
    budgetId: string | null,
    revision: number | null,
    version?: number | null,
  ) => void;
  clearOverride: () => void;
};

const defaultValue: BudgetRevisionSessionValue = {
  budgetId: null,
  workingRevisionId: null,
  docVersion: 0,
  hasUserOverride: false,
  setWorkingRevisionId: () => {},
  setDocVersion: () => {},
  syncFromServerSnapshot: () => {},
  clearOverride: () => {},
};

const BudgetRevisionSessionContext = createContext<BudgetRevisionSessionValue>(defaultValue);

const STORAGE_PREFIX = "budget-revision-session:";

type PersistedSession = {
  revision: number | null;
  version: number | null;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function normalizeRevision(input: unknown): number | null {
  if (typeof input === "number" && !Number.isNaN(input)) return input;
  if (typeof input === "string" && input.trim() !== "") {
    const parsed = Number(input);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function readPersistedSession(budgetId: string): PersistedSession | null {
  if (typeof window === "undefined" || !window?.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${budgetId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    const revision = normalizeRevision(parsed?.revision);
    const version = isFiniteNumber(parsed?.version) ? parsed?.version ?? null : null;
    return { revision, version };
  } catch (err) {
    console.warn("Failed to read persisted budget session", err);
    return null;
  }
}

function persistSession(budgetId: string, session: PersistedSession): void {
  if (typeof window === "undefined" || !window?.localStorage) return;
  if (!budgetId) return;
  try {
    const payload: PersistedSession = {
      revision: normalizeRevision(session.revision),
      version: isFiniteNumber(session.version) ? session.version : null,
    };
    window.localStorage.setItem(`${STORAGE_PREFIX}${budgetId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to persist budget session", err);
  }
}

function clearPersistedSession(budgetId: string): void {
  if (typeof window === "undefined" || !window?.localStorage) return;
  if (!budgetId) return;
  try {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${budgetId}`);
  } catch (err) {
    console.warn("Failed to clear budget session", err);
  }
}

type SessionState = {
  budgetId: string | null;
  workingRevisionId: number | null;
  docVersion: number;
  userPinned: boolean;
};

const initialState: SessionState = {
  budgetId: null,
  workingRevisionId: null,
  docVersion: 0,
  userPinned: false,
};

type ProviderProps = React.PropsWithChildren<unknown>;

export const BudgetRevisionSessionProvider: React.FC<ProviderProps> = ({ children }) => {
  const [state, setState] = useState<SessionState>(initialState);

  const syncFromServerSnapshot = useCallback<BudgetRevisionSessionValue["syncFromServerSnapshot"]>(
    (incomingBudgetId, incomingRevision, incomingVersion) => {
      setState((prev) => {
        if (!incomingBudgetId) {
          if (
            prev.budgetId === null &&
            prev.workingRevisionId === null &&
            prev.docVersion === 0 &&
            !prev.userPinned
          ) {
            return prev;
          }
          return initialState;
        }

        const normalizedRevision = normalizeRevision(incomingRevision);
        const normalizedVersion = isFiniteNumber(incomingVersion) ? incomingVersion : null;

        if (incomingBudgetId !== prev.budgetId) {
          const persisted = readPersistedSession(incomingBudgetId);
          const revisionFromStorage = persisted?.revision ?? normalizedRevision;
          const versionFromStorage =
            persisted?.version ?? normalizedVersion ?? (prev.docVersion || 0);

          if (persisted) {
            return {
              budgetId: incomingBudgetId,
              workingRevisionId: revisionFromStorage,
              docVersion: versionFromStorage ?? 0,
              userPinned: persisted.revision != null,
            };
          }

          persistSession(incomingBudgetId, {
            revision: revisionFromStorage,
            version: versionFromStorage,
          });

          return {
            budgetId: incomingBudgetId,
            workingRevisionId: revisionFromStorage,
            docVersion: versionFromStorage ?? 0,
            userPinned: false,
          };
        }

        let nextRevision = prev.workingRevisionId;
        if (!prev.userPinned && normalizedRevision != null) {
          nextRevision = normalizedRevision;
        }

        const nextVersion = normalizedVersion ?? prev.docVersion;

        if (prev.budgetId) {
          persistSession(prev.budgetId, { revision: nextRevision, version: nextVersion });
        }

        if (
          nextRevision === prev.workingRevisionId &&
          nextVersion === prev.docVersion &&
          prev.userPinned === prev.userPinned
        ) {
          return prev;
        }

        return {
          budgetId: prev.budgetId,
          workingRevisionId: nextRevision,
          docVersion: nextVersion,
          userPinned: prev.userPinned,
        };
      });
    },
    [],
  );

  const setWorkingRevisionId = useCallback<BudgetRevisionSessionValue["setWorkingRevisionId"]>(
    (revision, options = {}) => {
      const { persist = true, markOverride } = options;
      setState((prev) => {
        const nextRevision = normalizeRevision(revision);
        const shouldMarkOverride =
          typeof markOverride === "boolean" ? markOverride : persist;
        const nextState: SessionState = {
          budgetId: prev.budgetId,
          workingRevisionId: nextRevision,
          docVersion: prev.docVersion,
          userPinned: shouldMarkOverride ? true : prev.userPinned && nextRevision != null,
        };

        if (prev.budgetId && persist) {
          if (nextRevision == null) {
            clearPersistedSession(prev.budgetId);
          } else {
            persistSession(prev.budgetId, {
              revision: nextRevision,
              version: prev.docVersion,
            });
          }
        }

        if (
          nextState.workingRevisionId === prev.workingRevisionId &&
          nextState.userPinned === prev.userPinned
        ) {
          return prev;
        }
        return nextState;
      });
    },
    [],
  );

  const setDocVersion = useCallback<BudgetRevisionSessionValue["setDocVersion"]>(
    (version, options = {}) => {
      const { persist = true } = options;
      setState((prev) => {
        const nextVersion = isFiniteNumber(version) ? version : prev.docVersion;
        if (nextVersion === prev.docVersion) return prev;
        if (prev.budgetId && persist) {
          persistSession(prev.budgetId, {
            revision: prev.workingRevisionId,
            version: nextVersion,
          });
        }
        return { ...prev, docVersion: nextVersion };
      });
    },
    [],
  );

  const clearOverride = useCallback(() => {
    setState((prev) => ({ ...prev, userPinned: false }));
  }, []);

  const value = useMemo<BudgetRevisionSessionValue>(
    () => ({
      budgetId: state.budgetId,
      workingRevisionId: state.workingRevisionId,
      docVersion: state.docVersion,
      hasUserOverride: state.userPinned,
      setWorkingRevisionId,
      setDocVersion,
      syncFromServerSnapshot,
      clearOverride,
    }),
    [state, setWorkingRevisionId, setDocVersion, syncFromServerSnapshot, clearOverride],
  );

  return (
    <BudgetRevisionSessionContext.Provider value={value}>
      {children}
    </BudgetRevisionSessionContext.Provider>
  );
};

export const useBudgetRevisionSession = (): BudgetRevisionSessionValue =>
  useContext(BudgetRevisionSessionContext);

export default BudgetRevisionSessionContext;
