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
const REFRESH_INTERVAL_MS = 15_000;
const CACHE_KEY = "customs-draft:shared-cache";
const MIGRATED_KEY = "customs-draft:migrated-v1";

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

function alreadyMigrated(): boolean {
  try {
    return localStorage.getItem(MIGRATED_KEY) === "1";
  } catch {
    return false;
  }
}

function markMigrated() {
  try {
    localStorage.setItem(MIGRATED_KEY, "1");
  } catch {
    // ignore
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
  const saving = useRef(false);
  const mounted = useRef(true);
  const dirty = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persist = useCallback(async (next: AppState, sha: string | null) => {
    saving.current = true;
    setSyncStatus("saving");
    try {
      const res = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ state: next, sha }),
      });

      if (res.status === 409) {
        const conflict = (await res.json()) as {
          state?: AppState;
          sha?: string | null;
        };
        if (conflict.sha) {
          const retry = await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
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
          dirty.current = false;
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
      dirty.current = false;
      if (mounted.current) setSyncStatus("saved");
    } catch (err) {
      console.error("[app-state] save failed:", err);
      writeCache(next);
      if (mounted.current) setSyncStatus("error");
    } finally {
      saving.current = false;
    }
  }, []);

  const scheduleSave = useCallback(
    (next: AppState) => {
      dirty.current = true;
      writeCache(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(next, shaRef.current);
      }, SAVE_DEBOUNCE_MS);
    },
    [persist]
  );

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      // Don't clobber in-progress local edits with a remote pull.
      if (dirty.current || saving.current) return;

      if (!opts?.silent) setSyncStatus("loading");
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        const data = (await res.json()) as {
          state?: AppState;
          sha?: string | null;
          backend?: string;
          error?: string;
        };
        if (!res.ok || !data.state) {
          throw new Error(data.error || `Load failed (${res.status})`);
        }

        let next = mergeAppState(emptyAppState(), data.state);
        shaRef.current = data.sha ?? null;
        if (data.backend) setBackend(data.backend);

        // One-time migration only — never re-upload empty/stale local data.
        if (isAppStateEmpty(next) && !alreadyMigrated()) {
          const legacy = readLegacyLocalState();
          if (legacy && !isAppStateEmpty(mergeAppState(emptyAppState(), legacy))) {
            next = mergeAppState(next, {
              ...legacy,
              updatedAt: Date.now(),
            });
            setState(next);
            stateRef.current = next;
            writeCache(next);
            setHydrated(true);
            readyToSave.current = true;
            markMigrated();
            setSyncStatus("saving");
            await persist(next, shaRef.current);
            return;
          }
          markMigrated();
        }

        // If the server returns empty but we have a richer local cache,
        // keep the cache visible (don't blank the tier list) and keep trying.
        const cached = readCache();
        if (
          isAppStateEmpty(next) &&
          cached &&
          !isAppStateEmpty(mergeAppState(emptyAppState(), cached))
        ) {
          const keep = mergeAppState(emptyAppState(), cached);
          setState(keep);
          stateRef.current = keep;
          setHydrated(true);
          readyToSave.current = true;
          setSyncStatus("error");
          return;
        }

        setState(next);
        stateRef.current = next;
        writeCache(next);
        setHydrated(true);
        readyToSave.current = true;
        setSyncStatus("saved");
      } catch (err) {
        console.error("[app-state] load failed:", err);
        if (!hydrated) {
          const cached = readCache() ?? readLegacyLocalState();
          if (cached) {
            const next = mergeAppState(emptyAppState(), cached);
            setState(next);
            stateRef.current = next;
          }
          setHydrated(true);
          // Allow retries from edits; persist will surface Save error if API is down.
          readyToSave.current = true;
        }
        setSyncStatus("error");
      }
    },
    [persist, hydrated]
  );

  useEffect(() => {
    mounted.current = true;
    void refresh();

    const onFocus = () => {
      void refresh({ silent: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh({ silent: true });
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => {
      void refresh({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => {
      mounted.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
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
        refresh: () => refresh(),
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
