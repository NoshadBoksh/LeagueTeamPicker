"use client";

import { useCallback, useMemo } from "react";
import { PLAYERS } from "@/data/players";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { RatingsOverride, Role, Tier } from "@/lib/types";

const KEY = "customs-draft:ratings";

export function useRatings() {
  const [overrides, setOverrides, hydrated] = useLocalStorage<RatingsOverride>(
    KEY,
    {}
  );

  const getTier = useCallback(
    (playerId: string, role: Role): Tier | null => {
      const player = PLAYERS.find((p) => p.id === playerId);
      if (!player) return null;
      return overrides[playerId]?.[role] ?? player.ratings[role] ?? null;
    },
    [overrides]
  );

  const setTier = useCallback(
    (playerId: string, role: Role, tier: Tier | null) => {
      setOverrides((prev) => {
        const player = PLAYERS.find((p) => p.id === playerId);
        const current = {
          ...(player?.ratings ?? {}),
          ...(prev[playerId] ?? {}),
        };

        if (tier === null) {
          delete current[role];
        } else {
          current[role] = tier;
        }

        return { ...prev, [playerId]: current };
      });
    },
    [setOverrides]
  );

  const resetRatings = useCallback(() => {
    setOverrides({});
  }, [setOverrides]);

  const effectiveOverrides = useMemo(() => overrides, [overrides]);

  return {
    overrides: effectiveOverrides,
    getTier,
    setTier,
    resetRatings,
    hydrated,
  };
}
