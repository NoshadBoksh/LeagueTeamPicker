"use client";

import { useCallback } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  avoidPairKey,
  makeAvoidPair,
  type AvoidPair,
  type AvoidPairs,
} from "@/lib/types";

export function useAvoidPairs() {
  const { state, updateState, hydrated } = useAppState();
  const pairs = state.avoidPairs;

  const hasPair = useCallback(
    (id1: string, id2: string) => {
      const pair = makeAvoidPair(id1, id2);
      if (!pair) return false;
      const key = avoidPairKey(pair);
      return pairs.some((p) => avoidPairKey(p) === key);
    },
    [pairs]
  );

  const addPair = useCallback(
    (id1: string, id2: string) => {
      const pair = makeAvoidPair(id1, id2);
      if (!pair) return;
      updateState((prev) => {
        const key = avoidPairKey(pair);
        if (prev.avoidPairs.some((p) => avoidPairKey(p) === key)) return prev;
        const avoidPairs: AvoidPairs = [...prev.avoidPairs, pair];
        return { ...prev, avoidPairs };
      });
    },
    [updateState]
  );

  const removePair = useCallback(
    (pair: AvoidPair) => {
      const key = avoidPairKey(pair);
      updateState((prev) => ({
        ...prev,
        avoidPairs: prev.avoidPairs.filter((p) => avoidPairKey(p) !== key),
      }));
    },
    [updateState]
  );

  const resetPairs = useCallback(() => {
    updateState((prev) => ({ ...prev, avoidPairs: [] }));
  }, [updateState]);

  return {
    pairs,
    hasPair,
    addPair,
    removePair,
    resetPairs,
    hydrated,
  };
}
