"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  avoidPairKey,
  makeAvoidPair,
  type AvoidPair,
  type AvoidPairs,
} from "@/lib/types";

const KEY = "customs-draft:avoid-pairs";

export function useAvoidPairs() {
  const [pairs, setPairs, hydrated] = useLocalStorage<AvoidPairs>(KEY, []);

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
      setPairs((prev) => {
        const key = avoidPairKey(pair);
        if (prev.some((p) => avoidPairKey(p) === key)) return prev;
        return [...prev, pair];
      });
    },
    [setPairs]
  );

  const removePair = useCallback(
    (pair: AvoidPair) => {
      const key = avoidPairKey(pair);
      setPairs((prev) => prev.filter((p) => avoidPairKey(p) !== key));
    },
    [setPairs]
  );

  const resetPairs = useCallback(() => {
    setPairs([]);
  }, [setPairs]);

  return {
    pairs,
    hasPair,
    addPair,
    removePair,
    resetPairs,
    hydrated,
  };
}
