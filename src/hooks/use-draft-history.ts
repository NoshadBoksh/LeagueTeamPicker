"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  applyDraftToStats,
  recomputeWinsFromHistory,
} from "@/lib/storage";
import type { DraftResult, GameResult, PlayerStats } from "@/lib/types";

const HISTORY_KEY = "customs-draft:history";
const STATS_KEY = "customs-draft:stats";

export function useDraftHistory() {
  const [history, setHistory, historyHydrated] = useLocalStorage<DraftResult[]>(
    HISTORY_KEY,
    []
  );
  const [stats, setStats, statsHydrated] = useLocalStorage<
    Record<string, PlayerStats>
  >(STATS_KEY, {});
  const hydrated = historyHydrated && statsHydrated;

  const addDraft = useCallback(
    (draft: DraftResult) => {
      setHistory((prev) => [draft, ...prev].slice(0, 100));
      setStats((prev) => applyDraftToStats(prev, draft));
    },
    [setHistory, setStats]
  );

  const updateDraftResult = useCallback(
    (draftId: string, result: GameResult | undefined) => {
      setHistory((prev) => {
        const next = prev.map((d) =>
          d.id === draftId
            ? { ...d, result: result ?? undefined }
            : d
        );
        setStats((statsPrev) => recomputeWinsFromHistory(statsPrev, next));
        return next;
      });
    },
    [setHistory, setStats]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setStats((prev) => {
      const cleared: Record<string, PlayerStats> = {};
      for (const [id, s] of Object.entries(prev)) {
        cleared[id] = { ...s, wins: 0, losses: 0 };
      }
      return cleared;
    });
  }, [setHistory, setStats]);

  const clearStats = useCallback(() => {
    setStats({});
  }, [setStats]);

  return {
    history,
    stats,
    addDraft,
    updateDraftResult,
    clearHistory,
    clearStats,
    hydrated,
  };
}
