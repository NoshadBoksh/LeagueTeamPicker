import {
  makeTogetherPair,
  togetherPairKey,
  type TogetherPairs,
} from "@/lib/types";

/** Cryptic localStorage key — secret Gabriel↔Aman lock (default on). */
export const SECRET_GA_LOCK_KEY = "customs-draft:x-ga";

/** Double-tap this player in the lobby to toggle the lock. */
export const SECRET_GA_LOCK_PLAYER_ID = "gabriel";

const SECRET_PAIR = makeTogetherPair("aman", "gabriel")!;

/**
 * Hard-coded keep-together pairs — applied quietly when the secret lock is on.
 * Not shown in the Roles UI.
 */
export const BUILT_IN_TOGETHER_PAIRS: TogetherPairs = [SECRET_PAIR];

export function readSecretGaLock(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(SECRET_GA_LOCK_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

export function writeSecretGaLock(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SECRET_GA_LOCK_KEY, on ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
}

/** Merge user keep-together pairs with built-ins when the secret lock is on. */
export function mergeTogetherPairs(
  user?: TogetherPairs,
  secretGaLock = true
): TogetherPairs {
  const builtIns = secretGaLock ? BUILT_IN_TOGETHER_PAIRS : [];
  const seen = new Set<string>();
  const out: TogetherPairs = [];
  for (const pair of [...builtIns, ...(user ?? [])]) {
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
  return togetherPairKey(pair) === togetherPairKey(SECRET_PAIR);
}

/** True when Aman should be pinned to Gabriel in the bot-lane matchup. */
export function shouldPinAmanWithGabriel(
  togetherPairs?: TogetherPairs
): boolean {
  if (!togetherPairs?.length) return false;
  const key = togetherPairKey(SECRET_PAIR);
  return togetherPairs.some((p) => togetherPairKey(p) === key);
}
