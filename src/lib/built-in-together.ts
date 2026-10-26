import {
  makeTogetherPair,
  togetherPairKey,
  type TogetherPairs,
} from "@/lib/types";

/**
 * Hard-coded keep-together pairs — always applied in drafts,
 * even if not listed in shared app state.
 */
export const BUILT_IN_TOGETHER_PAIRS: TogetherPairs = [
  makeTogetherPair("aman", "gabriel")!,
];

/** Merge user keep-together pairs with built-ins (deduped). */
export function mergeTogetherPairs(user?: TogetherPairs): TogetherPairs {
  const seen = new Set<string>();
  const out: TogetherPairs = [];
  for (const pair of [...BUILT_IN_TOGETHER_PAIRS, ...(user ?? [])]) {
    const key = togetherPairKey(pair);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pair);
  }
  return out;
}

export function isBuiltInTogetherPair(id1: string, id2: string): boolean {
  const pair = makeTogetherPair(id1, id2);
  if (!pair) return false;
  const key = togetherPairKey(pair);
  return BUILT_IN_TOGETHER_PAIRS.some((p) => togetherPairKey(p) === key);
}
