"use client";

import { useCallback } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
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
        teamNames: input.teamNames,
      };
      updateState((prev) => ({
        ...prev,
        prizePoints: {
          ...prev.prizePoints,
          [input.playerId]: (prev.prizePoints[input.playerId] ?? 0) + 1,
        },
        prizeLog: [entry, ...prev.prizeLog].slice(0, 200),
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

  const resetAll = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      prizePoints: {},
      prizeLog: [],
    }));
  }, [updateState]);

  return {
    points,
    log,
    getPoints,
    awardSpin,
    cashIn,
    resetAll,
    hydrated,
    prizeCost: MYSTERY_PRIZE_COST,
  };
}
