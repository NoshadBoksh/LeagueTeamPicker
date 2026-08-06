"use client";

import { useCallback, useMemo } from "react";
import { PLAYERS } from "@/data/players";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  normalizeTier,
  type ActiveTier,
  type RatingKey,
  type RatingsOverride,
} from "@/lib/types";

export function useRatings() {
  const { state, updateState, hydrated } = useAppState();
  const overrides = state.ratings;

  const getTier = useCallback(
    (playerId: string, key: RatingKey): ActiveTier | null => {
      const player = PLAYERS.find((p) => p.id === playerId);
      if (!player) return null;
      return normalizeTier(
        overrides[playerId]?.[key] ?? player.ratings[key] ?? null
      );
    },
    [overrides]
  );

  const setTier = useCallback(
    (playerId: string, key: RatingKey, tier: ActiveTier | null) => {
      updateState((prev) => {
        const player = PLAYERS.find((p) => p.id === playerId);
        const current = {
          ...(player?.ratings ?? {}),
          ...(prev.ratings[playerId] ?? {}),
        };

        if (tier === null) {
          delete current[key];
        } else {
          current[key] = tier;
        }

        const ratings: RatingsOverride = {
          ...prev.ratings,
          [playerId]: current,
        };
        return { ...prev, ratings };
      });
    },
    [updateState]
  );

  const resetRatings = useCallback(() => {
    updateState((prev) => ({ ...prev, ratings: {} }));
  }, [updateState]);

  const effectiveOverrides = useMemo(() => overrides, [overrides]);

  return {
    overrides: effectiveOverrides,
    getTier,
    setTier,
    resetRatings,
    hydrated,
  };
}
