"use client";

import { useCallback } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  applyDraftToStats,
  recomputeWinsFromHistory,
} from "@/lib/storage";
import type {
  DraftResult,
  GameResult,
  PlayerStats,
  Series,
} from "@/lib/types";
import { uid } from "@/lib/utils";

export function useDraftHistory() {
  const { state, updateState, hydrated } = useAppState();
  const history = state.history;
  const stats = state.stats;
  const series = state.series;
  const defaultLobbyIds = state.defaultLobbyIds;

  const addDraft = useCallback(
    (draft: DraftResult) => {
      updateState((prev) => {
        const historyNext = [draft, ...prev.history].slice(0, 100);
        const statsNext = recomputeWinsFromHistory(
          applyDraftToStats(prev.stats, draft),
          historyNext
        );
        return { ...prev, history: historyNext, stats: statsNext };
      });
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
      return { ...prev, history: [], stats: cleared, series: [] };
    });
  }, [updateState]);

  const clearStats = useCallback(() => {
    updateState((prev) => ({ ...prev, stats: {} }));
  }, [updateState]);

  const createSeries = useCallback(
    (draftIds: string[], label?: string) => {
      const id = uid();
      const seriesEntry: Series = {
        id,
        label:
          label?.trim() ||
          `Bo3 · ${new Date().toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}`,
        draftIds: draftIds.slice(0, 3),
        createdAt: Date.now(),
      };
      updateState((prev) => ({
        ...prev,
        series: [seriesEntry, ...prev.series].slice(0, 50),
        history: prev.history.map((d) =>
          draftIds.includes(d.id) ? { ...d, seriesId: id } : d
        ),
      }));
      return id;
    },
    [updateState]
  );

  const addDraftToSeries = useCallback(
    (seriesId: string, draftId: string) => {
      updateState((prev) => {
        const target = prev.series.find((s) => s.id === seriesId);
        if (!target) return prev;
        if (target.draftIds.includes(draftId) || target.draftIds.length >= 3) {
          return prev;
        }
        return {
          ...prev,
          series: prev.series.map((s) =>
            s.id === seriesId
              ? { ...s, draftIds: [...s.draftIds, draftId] }
              : s
          ),
          history: prev.history.map((d) =>
            d.id === draftId ? { ...d, seriesId } : d
          ),
        };
      });
    },
    [updateState]
  );

  const removeDraftFromSeries = useCallback(
    (seriesId: string, draftId: string) => {
      updateState((prev) => ({
        ...prev,
        series: prev.series
          .map((s) =>
            s.id === seriesId
              ? { ...s, draftIds: s.draftIds.filter((id) => id !== draftId) }
              : s
          )
          .filter((s) => s.draftIds.length > 0),
        history: prev.history.map((d) =>
          d.id === draftId && d.seriesId === seriesId
            ? { ...d, seriesId: undefined }
            : d
        ),
      }));
    },
    [updateState]
  );

  const deleteSeries = useCallback(
    (seriesId: string) => {
      updateState((prev) => ({
        ...prev,
        series: prev.series.filter((s) => s.id !== seriesId),
        history: prev.history.map((d) =>
          d.seriesId === seriesId ? { ...d, seriesId: undefined } : d
        ),
      }));
    },
    [updateState]
  );

  const setDefaultLobby = useCallback(
    (playerIds: string[]) => {
      const ids = playerIds.slice(0, 10);
      updateState((prev) => ({
        ...prev,
        defaultLobbyIds: ids.length === 10 ? ids : [],
      }));
    },
    [updateState]
  );

  const clearDefaultLobby = useCallback(() => {
    updateState((prev) => ({ ...prev, defaultLobbyIds: [] }));
  }, [updateState]);

  return {
    history,
    stats,
    series,
    defaultLobbyIds,
    addDraft,
    updateDraftResult,
    clearHistory,
    clearStats,
    createSeries,
    addDraftToSeries,
    removeDraftFromSeries,
    deleteSeries,
    setDefaultLobby,
    clearDefaultLobby,
    hydrated,
  };
}
