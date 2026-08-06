"use client";

import { useCallback } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  applyDraftToStats,
  recomputeWinsFromHistory,
} from "@/lib/storage";
import type { DraftResult, GameResult, PlayerStats } from "@/lib/types";

export function useDraftHistory() {
  const { state, updateState, hydrated } = useAppState();
  const history = state.history;
  const stats = state.stats;

  const addDraft = useCallback(
    (draft: DraftResult) => {
      updateState((prev) => ({
        ...prev,
        history: [draft, ...prev.history].slice(0, 100),
        stats: applyDraftToStats(prev.stats, draft),
      }));
    },
    [updateState]
  );

  const updateDraftResult = useCallback(
    (draftId: string, result: GameResult | undefined) => {
      updateState((prev) => {
        const nextHistory = prev.history.map((d) =>
          d.id === draftId ? { ...d, result: result ?? undefined } : d
        );
        return {
          ...prev,
          history: nextHistory,
          stats: recomputeWinsFromHistory(prev.stats, nextHistory),
        };
      });
    },
    [updateState]
  );

  const clearHistory = useCallback(() => {
    updateState((prev) => {
      const cleared: Record<string, PlayerStats> = {};
      for (const [id, s] of Object.entries(prev.stats)) {
        cleared[id] = { ...s, wins: 0, losses: 0 };
      }
      return { ...prev, history: [], stats: cleared };
    });
  }, [updateState]);

  const clearStats = useCallback(() => {
    updateState((prev) => ({ ...prev, stats: {} }));
  }, [updateState]);

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
