"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  MYSTERY_PRIZE_COST,
  type PrizeLogEntry,
  type PrizePoints,
} from "@/lib/types";
import { uid } from "@/lib/utils";

const POINTS_KEY = "customs-draft:prize-points";
const LOG_KEY = "customs-draft:prize-log";

export function usePrizePoints() {
  const [points, setPoints, pointsHydrated] = useLocalStorage<PrizePoints>(
    POINTS_KEY,
    {}
  );
  const [log, setLog, logHydrated] = useLocalStorage<PrizeLogEntry[]>(
    LOG_KEY,
    []
  );

  const hydrated = pointsHydrated && logHydrated;

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
      setPoints((prev) => ({
        ...prev,
        [input.playerId]: (prev[input.playerId] ?? 0) + 1,
      }));
      setLog((prev) =>
        [
          {
            id: uid(),
            kind: "spin" as const,
            playerId: input.playerId,
            playerName: input.playerName,
            delta: 1,
            pointsAfter: nextPoints,
            at: Date.now(),
            draftId: input.draftId,
            teamNames: input.teamNames,
          },
          ...prev,
        ].slice(0, 200)
      );
      return nextPoints;
    },
    [points, setPoints, setLog]
  );

  const cashIn = useCallback(
    (playerId: string, playerName: string) => {
      const current = points[playerId] ?? 0;
      if (current < MYSTERY_PRIZE_COST) return null;

      const nextPoints = current - MYSTERY_PRIZE_COST;
      setPoints((prev) => ({ ...prev, [playerId]: nextPoints }));
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
      setLog((prev) => [entry, ...prev].slice(0, 200));
      return entry;
    },
    [points, setPoints, setLog]
  );

  const resetAll = useCallback(() => {
    setPoints({});
    setLog([]);
  }, [setPoints, setLog]);

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
