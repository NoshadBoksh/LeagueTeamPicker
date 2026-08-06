"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  emptyAppState,
  isAppStateEmpty,
  mergeAppState,
  readLegacyLocalState,
  type AppState,
} from "@/lib/app-state";

export type SyncStatus =
  | "loading"
  | "saving"
  | "saved"
  | "offline"
  | "error";

interface AppStateContextValue {
  state: AppState;
  hydrated: boolean;
  syncStatus: SyncStatus;
  backend: string | null;
  updateState: (updater: (prev: AppState) => AppState) => void;
  refresh: () => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 450;
const CACHE_KEY = "customs-draft:shared-cache";

function writeCache(state: AppState) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

function readCache(): AppState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return mergeAppState(emptyAppState(), JSON.parse(raw) as Partial<AppState>);
  } catch {
    return null;
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(emptyAppState);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [backend, setBackend] = useState<string | null>(null);

  const shaRef = useRef<string | null>(null);
  const stateRef = useRef(state);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyToSave = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persist = useCallback(async (next: AppState, sha: string | null) => {
    setSyncStatus("saving");
    try {
      const res = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: next, sha }),
      });

      if (res.status === 409) {
        const conflict = (await res.json()) as {
          state?: AppState;
          sha?: string | null;
        };
        // Last-write-wins: retry once with the latest sha.
        if (conflict.sha) {
          const retry = await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: next, sha: conflict.sha }),
          });
          if (!retry.ok) throw new Error("Conflict retry failed");
          const data = (await retry.json()) as {
            state: AppState;
            sha: string | null;
            backend?: string;
          };
          shaRef.current = data.sha;
          if (data.backend) setBackend(data.backend);
          writeCache(data.state);
          if (mounted.current) setSyncStatus("saved");
          return;
        }
        throw new Error("Conflict");
      }

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error || `Save failed (${res.status})`);
      }

      const data = (await res.json()) as {
        state: AppState;
        sha: string | null;
        backend?: string;
      };
      shaRef.current = data.sha;
      if (data.backend) setBackend(data.backend);
      writeCache(data.state);
      if (mounted.current) setSyncStatus("saved");
    } catch (err) {
      console.error("[app-state] save failed:", err);
      writeCache(next);
      if (mounted.current) setSyncStatus("error");
    }
  }, []);

  const scheduleSave = useCallback(
    (next: AppState) => {
      writeCache(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(next, shaRef.current);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist]
  );

  const refresh = useCallback(async () => {
    setSyncStatus("loading");
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = (await res.json()) as {
        state: AppState;
        sha: string | null;
        backend?: string;
      };

      let next = mergeAppState(emptyAppState(), data.state);
      shaRef.current = data.sha;
      if (data.backend) setBackend(data.backend);

      // One-time migration: lift old localStorage into the shared store.
      if (isAppStateEmpty(next)) {
        const legacy = readLegacyLocalState();
        if (legacy) {
          next = mergeAppState(next, {
            ...legacy,
            updatedAt: Date.now(),
          });
          setState(next);
          stateRef.current = next;
          writeCache(next);
          setHydrated(true);
          readyToSave.current = true;
          setSyncStatus("saving");
          await persist(next, shaRef.current);
          return;
        }
      }

      setState(next);
      stateRef.current = next;
      writeCache(next);
      setHydrated(true);
      readyToSave.current = true;
      setSyncStatus("saved");
    } catch (err) {
      console.error("[app-state] load failed:", err);
      const cached = readCache() ?? readLegacyLocalState();
      if (cached) {
        const next = mergeAppState(emptyAppState(), cached);
        setState(next);
        stateRef.current = next;
      }
      setHydrated(true);
      readyToSave.current = true;
      setSyncStatus("offline");
    }
  }, [persist]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [refresh]);

  const updateState = useCallback(
    (updater: (prev: AppState) => AppState) => {
      setState((prev) => {
        const next = {
          ...updater(prev),
          updatedAt: Date.now(),
          version: 1,
        };
        stateRef.current = next;
        if (readyToSave.current) {
          scheduleSave(next);
        }
        return next;
      });
    },
    [scheduleSave]
  );

  return (
    <AppStateContext.Provider
      value={{
        state,
        hydrated,
        syncStatus,
        backend,
        updateState,
        refresh,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
