"use client";

import { useCallback, useMemo } from "react";
import { PLAYERS } from "@/data/players";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { RatingKey, RatingsOverride, Tier } from "@/lib/types";

const KEY = "customs-draft:ratings";

export function useRatings() {
  const [overrides, setOverrides, hydrated] = useLocalStorage<RatingsOverride>(
    KEY,
    {}
  );

  const getTier = useCallback(
    (playerId: string, key: RatingKey): Tier | null => {
      const player = PLAYERS.find((p) => p.id === playerId);
      if (!player) return null;
      return overrides[playerId]?.[key] ?? player.ratings[key] ?? null;
    },
    [overrides]
  );

  const setTier = useCallback(
    (playerId: string, key: RatingKey, tier: Tier | null) => {
      setOverrides((prev) => {
        const player = PLAYERS.find((p) => p.id === playerId);
        const current = {
          ...(player?.ratings ?? {}),
          ...(prev[playerId] ?? {}),
        };

        if (tier === null) {
          delete current[key];
        } else {
          current[key] = tier;
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
