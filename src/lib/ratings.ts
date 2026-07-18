import { PLAYERS } from "@/data/players";
import {
  AUTOFILL_PENALTY,
  ROLES,
  TIER_VALUES,
  type AssignedPlayer,
  type Player,
  type RatingsOverride,
  type Role,
  type Team,
  type TeamSide,
  type Tier,
} from "@/lib/types";

export function getEffectiveRatings(
  player: Player,
  overrides?: RatingsOverride
): Partial<Record<Role, Tier>> {
  return {
    ...player.ratings,
    ...(overrides?.[player.id] ?? {}),
  };
}

export function getPlayerTier(
  player: Player,
  role: Role,
  overrides?: RatingsOverride
): Tier | null {
  const ratings = getEffectiveRatings(player, overrides);
  return ratings[role] ?? null;
}

export function canPlayRole(
  player: Player,
  role: Role,
  overrides?: RatingsOverride
): boolean {
  return getPlayerTier(player, role, overrides) !== null;
}

export function getPlayableRoles(
  player: Player,
  overrides?: RatingsOverride
): Role[] {
  return ROLES.filter((role) => canPlayRole(player, role, overrides));
}

export function getRolePreference(
  player: Player,
  role: Role
): "primary" | "secondary" | "autofill" {
  if (player.primaryRoles.includes(role)) return "primary";
  if (player.secondaryRoles.includes(role)) return "secondary";
  return "autofill";
}

export function getRoleMmr(
  player: Player,
  role: Role,
  overrides?: RatingsOverride
): number {
  const tier = getPlayerTier(player, role, overrides) ?? "F";
  const base = TIER_VALUES[tier];
  const preference = getRolePreference(player, role);
  // Unavailable roles are always treated as hard autofill
  const forcedAutofill = getPlayerTier(player, role, overrides) === null;

  if (preference === "autofill" || forcedAutofill) {
    return Math.max(1, Math.round(base * AUTOFILL_PENALTY));
  }
  if (preference === "secondary") {
    return Math.max(1, Math.round(base * 0.92));
  }
  return base;
}

export function toAssignedPlayer(
  player: Player,
  role: Role,
  overrides?: RatingsOverride
): AssignedPlayer {
  const hasRating = getPlayerTier(player, role, overrides) !== null;
  const tier = getPlayerTier(player, role, overrides) ?? "F";
  const preference =
    !hasRating ? "autofill" : getRolePreference(player, role);

  return {
    playerId: player.id,
    name: player.name,
    role,
    tier,
    mmr: getRoleMmr(player, role, overrides),
    preference,
    autofilled: preference === "autofill",
  };
}

export function buildTeam(
  side: TeamSide,
  assignments: AssignedPlayer[]
): Team {
  const ordered = ROLES.map(
    (role) => assignments.find((a) => a.role === role)!
  ).filter(Boolean);

  return {
    side,
    players: ordered,
    mmr: ordered.reduce((sum, p) => sum + p.mmr, 0),
  };
}

export function computeWinChances(
  blueMmr: number,
  redMmr: number
): { blue: number; red: number } {
  const total = blueMmr + redMmr;
  if (total === 0) return { blue: 50, red: 50 };

  // Softmax-ish curve so small MMR gaps don't swing too hard
  const diff = blueMmr - redMmr;
  const blue = 50 + diff * 2.2;
  const clamped = Math.min(92, Math.max(8, blue));
  return {
    blue: Math.round(clamped),
    red: Math.round(100 - clamped),
  };
}

export function computeBalanceScore(blueMmr: number, redMmr: number): number {
  const max = Math.max(blueMmr, redMmr, 1);
  const diff = Math.abs(blueMmr - redMmr);
  return Math.round((1 - diff / max) * 100);
}

export function getFavorite(blueMmr: number, redMmr: number): TeamSide {
  if (redMmr > blueMmr) return "red";
  if (blueMmr > redMmr) return "blue";
  return Math.random() < 0.5 ? "blue" : "red";
}

export function getBestTierSummary(
  player: Player,
  overrides?: RatingsOverride
): { role: Role; tier: Tier } | null {
  const ratings = getEffectiveRatings(player, overrides);
  let best: { role: Role; tier: Tier } | null = null;

  for (const role of ROLES) {
    const tier = ratings[role];
    if (!tier) continue;
    if (!best || TIER_VALUES[tier] > TIER_VALUES[best.tier]) {
      best = { role, tier };
    }
  }
  return best;
}

export function mergePlayersWithOverrides(
  players: Player[],
  overrides?: RatingsOverride
): Player[] {
  return players.map((player) => ({
    ...player,
    ratings: getEffectiveRatings(player, overrides),
  }));
}

export function getAllDefaultOverrides(): RatingsOverride {
  const overrides: RatingsOverride = {};
  for (const player of PLAYERS) {
    overrides[player.id] = { ...player.ratings };
  }
  return overrides;
}
