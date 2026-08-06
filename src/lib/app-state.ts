import type {
  AvoidPairs,
  DraftResult,
  PrizeLogEntry,
  PrizePoints,
  RatingsOverride,
  RolePrefsOverride,
  PlayerStats,
} from "@/lib/types";

export const APP_STATE_VERSION = 1;

/** Shared app data persisted for the whole group (not per-browser). */
export interface AppState {
  version: number;
  updatedAt: number;
  ratings: RatingsOverride;
  history: DraftResult[];
  stats: Record<string, PlayerStats>;
  rolePrefs: RolePrefsOverride;
  avoidPairs: AvoidPairs;
  prizePoints: PrizePoints;
  prizeLog: PrizeLogEntry[];
}

export function emptyAppState(): AppState {
  return {
    version: APP_STATE_VERSION,
    updatedAt: 0,
    ratings: {},
    history: [],
    stats: {},
    rolePrefs: {},
    avoidPairs: [],
    prizePoints: {},
    prizeLog: [],
  };
}

export function isAppStateEmpty(state: AppState): boolean {
  return (
    Object.keys(state.ratings).length === 0 &&
    state.history.length === 0 &&
    Object.keys(state.stats).length === 0 &&
    Object.keys(state.rolePrefs).length === 0 &&
    state.avoidPairs.length === 0 &&
    Object.keys(state.prizePoints).length === 0 &&
    state.prizeLog.length === 0
  );
}

/** localStorage keys used by older builds — migrated once into shared state. */
export const LEGACY_STORAGE_KEYS = {
  ratings: "customs-draft:ratings",
  history: "customs-draft:history",
  stats: "customs-draft:stats",
  rolePrefs: "customs-draft:role-prefs",
  avoidPairs: "customs-draft:avoid-pairs",
  prizePoints: "customs-draft:prize-points",
  prizeLog: "customs-draft:prize-log",
} as const;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Read any leftover per-browser data for one-time migration. */
export function readLegacyLocalState(): Partial<AppState> | null {
  if (typeof window === "undefined") return null;
  try {
    const ratings = safeParse<RatingsOverride>(
      localStorage.getItem(LEGACY_STORAGE_KEYS.ratings),
      {}
    );
    const history = safeParse<DraftResult[]>(
      localStorage.getItem(LEGACY_STORAGE_KEYS.history),
      []
    );
    const stats = safeParse<Record<string, PlayerStats>>(
      localStorage.getItem(LEGACY_STORAGE_KEYS.stats),
      {}
    );
    const rolePrefs = safeParse<RolePrefsOverride>(
      localStorage.getItem(LEGACY_STORAGE_KEYS.rolePrefs),
      {}
    );
    const avoidPairs = safeParse<AvoidPairs>(
      localStorage.getItem(LEGACY_STORAGE_KEYS.avoidPairs),
      []
    );
    const prizePoints = safeParse<PrizePoints>(
      localStorage.getItem(LEGACY_STORAGE_KEYS.prizePoints),
      {}
    );
    const prizeLog = safeParse<PrizeLogEntry[]>(
      localStorage.getItem(LEGACY_STORAGE_KEYS.prizeLog),
      []
    );

    const partial: AppState = {
      ...emptyAppState(),
      ratings,
      history,
      stats,
      rolePrefs,
      avoidPairs,
      prizePoints,
      prizeLog,
    };

    if (isAppStateEmpty(partial)) return null;
    return partial;
  } catch {
    return null;
  }
}

export function mergeAppState(
  base: AppState,
  patch: Partial<AppState>
): AppState {
  return {
    version: APP_STATE_VERSION,
    updatedAt: Math.max(base.updatedAt, patch.updatedAt ?? 0),
    ratings: patch.ratings ?? base.ratings,
    history: patch.history ?? base.history,
    stats: patch.stats ?? base.stats,
    rolePrefs: patch.rolePrefs ?? base.rolePrefs,
    avoidPairs: patch.avoidPairs ?? base.avoidPairs,
    prizePoints: patch.prizePoints ?? base.prizePoints,
    prizeLog: patch.prizeLog ?? base.prizeLog,
  };
}

/**
 * Keep GitHub Contents payloads small: drop old match screenshots.
 * Newest drafts keep images; older ones are metadata-only.
 */
export function trimStateForPersist(state: AppState, keepImages = 12): AppState {
  const history = state.history.slice(0, 100).map((draft, i) => {
    if (i < keepImages || !draft.result?.leaderboardImage) return draft;
    const { leaderboardImage, ...result } = draft.result;
    void leaderboardImage;
    return { ...draft, result };
  });
  return {
    ...state,
    version: APP_STATE_VERSION,
    history,
    prizeLog: state.prizeLog.slice(0, 200),
  };
}

export function normalizeAppState(raw: unknown): AppState {
  const empty = emptyAppState();
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;
  return {
    version: typeof o.version === "number" ? o.version : APP_STATE_VERSION,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : 0,
    ratings:
      o.ratings && typeof o.ratings === "object"
        ? (o.ratings as RatingsOverride)
        : {},
    history: Array.isArray(o.history) ? (o.history as DraftResult[]) : [],
    stats:
      o.stats && typeof o.stats === "object"
        ? (o.stats as Record<string, PlayerStats>)
        : {},
    rolePrefs:
      o.rolePrefs && typeof o.rolePrefs === "object"
        ? (o.rolePrefs as RolePrefsOverride)
        : {},
    avoidPairs: Array.isArray(o.avoidPairs)
      ? (o.avoidPairs as AvoidPairs)
      : [],
    prizePoints:
      o.prizePoints && typeof o.prizePoints === "object"
        ? (o.prizePoints as PrizePoints)
        : {},
    prizeLog: Array.isArray(o.prizeLog)
      ? (o.prizeLog as PrizeLogEntry[])
      : [],
  };
}
