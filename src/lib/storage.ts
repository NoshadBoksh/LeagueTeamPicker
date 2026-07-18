import type {
  DraftResult,
  PlayerStats,
  Role,
  RatingsOverride,
} from "@/lib/types";
import { ROLES } from "@/lib/types";

const RATINGS_KEY = "customs-draft:ratings";
const HISTORY_KEY = "customs-draft:history";
const STATS_KEY = "customs-draft:stats";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadRatings(): RatingsOverride {
  if (typeof window === "undefined") return {};
  return safeParse(localStorage.getItem(RATINGS_KEY), {});
}

export function saveRatings(ratings: RatingsOverride): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
}

export function loadHistory(): DraftResult[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(HISTORY_KEY), []);
}

export function saveHistory(history: DraftResult[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 100)));
}

export function loadStats(): Record<string, PlayerStats> {
  if (typeof window === "undefined") return {};
  return safeParse(localStorage.getItem(STATS_KEY), {});
}

export function saveStats(stats: Record<string, PlayerStats>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function emptyStats(playerId: string): PlayerStats {
  return {
    playerId,
    totalGames: 0,
    blueAppearances: 0,
    redAppearances: 0,
    autofillCount: 0,
    wins: 0,
    losses: 0,
    roleCounts: Object.fromEntries(ROLES.map((r) => [r, 0])) as Record<
      Role,
      number
    >,
    teammateCounts: {},
    opponentCounts: {},
  };
}

export function applyDraftToStats(
  existing: Record<string, PlayerStats>,
  draft: DraftResult
): Record<string, PlayerStats> {
  const next = { ...existing };

  const ensure = (id: string) => {
    if (!next[id]) next[id] = emptyStats(id);
    next[id] = {
      ...next[id],
      roleCounts: { ...next[id].roleCounts },
      teammateCounts: { ...next[id].teammateCounts },
      opponentCounts: { ...next[id].opponentCounts },
    };
    return next[id];
  };

  const blueIds = draft.blue.players.map((p) => p.playerId);
  const redIds = draft.red.players.map((p) => p.playerId);

  for (const player of draft.blue.players) {
    const stats = ensure(player.playerId);
    stats.totalGames += 1;
    stats.blueAppearances += 1;
    stats.wins = stats.wins ?? 0;
    stats.losses = stats.losses ?? 0;
    stats.roleCounts[player.role] += 1;
    if (player.autofilled) stats.autofillCount += 1;
    for (const mate of blueIds) {
      if (mate === player.playerId) continue;
      stats.teammateCounts[mate] = (stats.teammateCounts[mate] ?? 0) + 1;
    }
    for (const opp of redIds) {
      stats.opponentCounts[opp] = (stats.opponentCounts[opp] ?? 0) + 1;
    }
  }

  for (const player of draft.red.players) {
    const stats = ensure(player.playerId);
    stats.totalGames += 1;
    stats.redAppearances += 1;
    stats.wins = stats.wins ?? 0;
    stats.losses = stats.losses ?? 0;
    stats.roleCounts[player.role] += 1;
    if (player.autofilled) stats.autofillCount += 1;
    for (const mate of redIds) {
      if (mate === player.playerId) continue;
      stats.teammateCounts[mate] = (stats.teammateCounts[mate] ?? 0) + 1;
    }
    for (const opp of blueIds) {
      stats.opponentCounts[opp] = (stats.opponentCounts[opp] ?? 0) + 1;
    }
  }

  return next;
}

/** Recompute W/L from history results so edits stay accurate. */
export function recomputeWinsFromHistory(
  existing: Record<string, PlayerStats>,
  history: DraftResult[]
): Record<string, PlayerStats> {
  const next: Record<string, PlayerStats> = {};
  for (const [id, stats] of Object.entries(existing)) {
    next[id] = {
      ...stats,
      wins: 0,
      losses: 0,
      roleCounts: { ...stats.roleCounts },
      teammateCounts: { ...stats.teammateCounts },
      opponentCounts: { ...stats.opponentCounts },
    };
  }

  for (const draft of history) {
    if (!draft.result) continue;
    const winnerIds =
      draft.result.winner === "blue"
        ? draft.blue.players.map((p) => p.playerId)
        : draft.red.players.map((p) => p.playerId);
    const loserIds =
      draft.result.winner === "blue"
        ? draft.red.players.map((p) => p.playerId)
        : draft.blue.players.map((p) => p.playerId);

    for (const id of winnerIds) {
      if (!next[id]) next[id] = emptyStats(id);
      next[id].wins += 1;
    }
    for (const id of loserIds) {
      if (!next[id]) next[id] = emptyStats(id);
      next[id].losses += 1;
    }
  }

  return next;
}

export function mostCommonId(
  counts: Record<string, number> | null | undefined
): string | null {
  if (!counts) return null;
  let best: string | null = null;
  let max = 0;
  for (const [id, count] of Object.entries(counts)) {
    if (typeof count === "number" && count > max) {
      max = count;
      best = id;
    }
  }
  return best;
}

export function mostCommonRole(
  counts: Partial<Record<Role, number>> | null | undefined
): Role | null {
  if (!counts) return null;
  let best: Role | null = null;
  let max = 0;
  for (const role of ROLES) {
    const count = counts[role] ?? 0;
    if (count > max) {
      max = count;
      best = role;
    }
  }
  return best;
}

/** Coerce localStorage stats into a safe shape for the UI. */
export function normalizePlayerStats(
  raw: Partial<PlayerStats> | null | undefined,
  playerId: string
): PlayerStats {
  const base = emptyStats(playerId);
  if (!raw || typeof raw !== "object") return base;

  const roleCounts = { ...base.roleCounts };
  if (raw.roleCounts && typeof raw.roleCounts === "object") {
    for (const role of ROLES) {
      const value = raw.roleCounts[role];
      roleCounts[role] = typeof value === "number" && value >= 0 ? value : 0;
    }
  }

  return {
    playerId,
    totalGames:
      typeof raw.totalGames === "number" && raw.totalGames >= 0
        ? raw.totalGames
        : 0,
    blueAppearances:
      typeof raw.blueAppearances === "number" && raw.blueAppearances >= 0
        ? raw.blueAppearances
        : 0,
    redAppearances:
      typeof raw.redAppearances === "number" && raw.redAppearances >= 0
        ? raw.redAppearances
        : 0,
    autofillCount:
      typeof raw.autofillCount === "number" && raw.autofillCount >= 0
        ? raw.autofillCount
        : 0,
    wins: typeof raw.wins === "number" && raw.wins >= 0 ? raw.wins : 0,
    losses: typeof raw.losses === "number" && raw.losses >= 0 ? raw.losses : 0,
    roleCounts,
    teammateCounts:
      raw.teammateCounts && typeof raw.teammateCounts === "object"
        ? raw.teammateCounts
        : {},
    opponentCounts:
      raw.opponentCounts && typeof raw.opponentCounts === "object"
        ? raw.opponentCounts
        : {},
  };
}
