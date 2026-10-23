"use client";

import { useCallback } from "react";
import { useAppState } from "@/components/providers/app-state-provider";
import {
  avoidPairKey,
  makeAvoidPair,
  makeTogetherPair,
  togetherPairKey,
  type TogetherPair,
  type TogetherPairs,
} from "@/lib/types";

export function useTogetherPairs() {
  const { state, updateState, hydrated } = useAppState();
  const pairs = state.togetherPairs;

  const hasPair = useCallback(
    (id1: string, id2: string) => {
      const pair = makeTogetherPair(id1, id2);
      if (!pair) return false;
      const key = togetherPairKey(pair);
      return pairs.some((p) => togetherPairKey(p) === key);
    },
    [pairs]
  );

  const addPair = useCallback(
    (id1: string, id2: string) => {
      const pair = makeTogetherPair(id1, id2);
      if (!pair) return;
      updateState((prev) => {
        const key = togetherPairKey(pair);
        if (prev.togetherPairs.some((p) => togetherPairKey(p) === key)) {
          return prev;
        }
        // Can't be both keep-apart and keep-together
        const avoid = makeAvoidPair(id1, id2);
        if (
          avoid &&
          prev.avoidPairs.some((p) => avoidPairKey(p) === avoidPairKey(avoid))
        ) {
          return prev;
        }
        const togetherPairs: TogetherPairs = [...prev.togetherPairs, pair];
        return { ...prev, togetherPairs };
      });
    },
    [updateState]
  );

  const removePair = useCallback(
    (pair: TogetherPair) => {
      const key = togetherPairKey(pair);
      updateState((prev) => ({
        ...prev,
        togetherPairs: prev.togetherPairs.filter(
          (p) => togetherPairKey(p) !== key
        ),
      }));
    },
    [updateState]
  );

  const resetPairs = useCallback(() => {
    updateState((prev) => ({ ...prev, togetherPairs: [] }));
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
