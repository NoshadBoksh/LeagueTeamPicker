"use client";

import { useCallback } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import { PLAYERS } from "@/data/players";
import {
  MYSTERY_PRIZE_COST,
  type PrizeLogEntry,
} from "@/lib/types";
import { uid } from "@/lib/utils";

export function usePrizePoints() {
  const { state, updateState, hydrated } = useAppState();
  const points = state.prizePoints;
  const log = state.prizeLog;

  const getPoints = useCallback(
    (playerId: string) => points[playerId] ?? 0,
    [points]
  );

  const awardSpin = useCallback(
    (input: {
      playerId: string;
      playerName: string;
      draftId?: string;
      seriesId?: string;
      teamNames: string[];
    }) => {
      const nextPoints = (points[input.playerId] ?? 0) + 1;
      const entry: PrizeLogEntry = {
        id: uid(),
        kind: "spin",
        playerId: input.playerId,
        playerName: input.playerName,
        delta: 1,
        pointsAfter: nextPoints,
        at: Date.now(),
        draftId: input.draftId,
        seriesId: input.seriesId,
        teamNames: input.teamNames,
      };
      updateState((prev) => ({
        ...prev,
        prizePoints: {
          ...prev.prizePoints,
          [input.playerId]: (prev.prizePoints[input.playerId] ?? 0) + 1,
        },
        prizeLog: [entry, ...prev.prizeLog].slice(0, 200),
        series: input.seriesId
          ? prev.series.map((s) =>
              s.id === input.seriesId
                ? {
                    ...s,
                    spunAt: Date.now(),
                    spunPlayerId: input.playerId,
                    spunPlayerName: input.playerName,
                  }
                : s
            )
          : prev.series,
      }));
      return nextPoints;
    },
    [points, updateState]
  );

  const cashIn = useCallback(
    (playerId: string, playerName: string) => {
      const current = points[playerId] ?? 0;
      if (current < MYSTERY_PRIZE_COST) return null;

      const nextPoints = current - MYSTERY_PRIZE_COST;
      const entry: PrizeLogEntry = {
        id: uid(),
        kind: "cashin",
        playerId,
        playerName,
        delta: -MYSTERY_PRIZE_COST,
        pointsAfter: nextPoints,
        at: Date.now(),
        prizeLabel: "Mystery Prize",
      };
      updateState((prev) => {
        const live = prev.prizePoints[playerId] ?? 0;
        if (live < MYSTERY_PRIZE_COST) return prev;
        const after = live - MYSTERY_PRIZE_COST;
        return {
          ...prev,
          prizePoints: { ...prev.prizePoints, [playerId]: after },
          prizeLog: [
            { ...entry, pointsAfter: after },
            ...prev.prizeLog,
          ].slice(0, 200),
        };
      });
      return entry;
    },
    [points, updateState]
  );

  const setPlayerPoints = useCallback(
    (playerId: string, playerName: string, next: number) => {
      const value = Math.max(0, Math.floor(next));
      updateState((prev) => {
        const before = prev.prizePoints[playerId] ?? 0;
        if (before === value) return prev;
        const entry: PrizeLogEntry = {
          id: uid(),
          kind: "adjust",
          playerId,
          playerName,
          delta: value - before,
          pointsAfter: value,
          at: Date.now(),
          note: "Manual edit",
        };
        return {
          ...prev,
          prizePoints: { ...prev.prizePoints, [playerId]: value },
          prizeLog: [entry, ...prev.prizeLog].slice(0, 200),
        };
      });
    },
    [updateState]
  );

  const undoLastSpin = useCallback(() => {
    updateState((prev) => {
      const idx = prev.prizeLog.findIndex((e) => e.kind === "spin");
      if (idx < 0) return prev;
      const spin = prev.prizeLog[idx];
      const after = Math.max(0, (prev.prizePoints[spin.playerId] ?? 0) - 1);
      const undoEntry: PrizeLogEntry = {
        id: uid(),
        kind: "undo",
        playerId: spin.playerId,
        playerName: spin.playerName,
        delta: -1,
        pointsAfter: after,
        at: Date.now(),
        draftId: spin.draftId,
        seriesId: spin.seriesId,
        note: "Undo last spin",
      };
      const nextLog = [...prev.prizeLog];
      nextLog.splice(idx, 1);
      return {
        ...prev,
        prizePoints: { ...prev.prizePoints, [spin.playerId]: after },
        prizeLog: [undoEntry, ...nextLog].slice(0, 200),
        series: spin.seriesId
          ? prev.series.map((s) =>
              s.id === spin.seriesId
                ? {
                    ...s,
                    spunAt: undefined,
                    spunPlayerId: undefined,
                    spunPlayerName: undefined,
                  }
                : s
            )
          : prev.series,
      };
    });
  }, [updateState]);

  const resetAll = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      prizePoints: {},
      prizeLog: [],
    }));
  }, [updateState]);

  const lastSpin = log.find((e) => e.kind === "spin") ?? null;
  const playerName = (id: string) =>
    PLAYERS.find((p) => p.id === id)?.name ?? id;

  return {
    points,
    log,
    getPoints,
    awardSpin,
    cashIn,
    setPlayerPoints,
    undoLastSpin,
    resetAll,
    lastSpin,
    playerName,
    hydrated,
    prizeCost: MYSTERY_PRIZE_COST,
  };
}
