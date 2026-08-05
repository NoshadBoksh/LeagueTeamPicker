import { PLAYERS } from "@/data/players";
import {
  AUTOFILL_PENALTY,
  ROLES,
  TIER_VALUES,
  normalizeTier,
  type ActiveTier,
  type AssignedPlayer,
  type Player,
  type RatingKey,
  type RatingsOverride,
  type Role,
  type RolePrefsOverride,
  type Team,
  type TeamSide,
  type Tier,
} from "@/lib/types";
import { canBeAssignedRole, resolveRolePrefs } from "@/lib/role-prefs";

export function getEffectiveRatings(
  player: Player,
  overrides?: RatingsOverride
): Partial<Record<RatingKey, Tier>> {
  return {
    ...player.ratings,
    ...(overrides?.[player.id] ?? {}),
  };
}

export function getPlayerTier(
  player: Player,
  key: RatingKey,
  overrides?: RatingsOverride
): ActiveTier | null {
  const ratings = getEffectiveRatings(player, overrides);
  return normalizeTier(ratings[key] ?? null);
}

export function getGeneralTier(
  player: Player,
  overrides?: RatingsOverride
): Tier | null {
  return getPlayerTier(player, "general", overrides);
}

/** General MMR is raw tier value — no autofill penalty (overall skill). */
export function getGeneralMmr(
  player: Player,
  overrides?: RatingsOverride
): number {
  const tier = getGeneralTier(player, overrides) ?? "C";
  return TIER_VALUES[tier];
}

/**
 * Hard gate for drafts: FILL → any role; otherwise only selected roles.
 * Unselected roles are never assignable (regardless of tier list).
 */
export function canPlayRole(
  player: Player,
  role: Role,
  _overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride
): boolean {
  return canBeAssignedRole(player.id, role, rolePrefs);
}

export function getPlayableRoles(
  player: Player,
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride
): Role[] {
  return ROLES.filter((role) =>
    canPlayRole(player, role, overrides, rolePrefs)
  );
}

export function getRolePreference(
  player: Player,
  role: Role,
  rolePrefs?: RolePrefsOverride
): "primary" | "secondary" | "autofill" {
  const prefs = resolveRolePrefs(rolePrefs, player.id);
  if (prefs.fill) return "autofill";
  if (prefs.roles.includes(role)) return "primary";
  if (player.primaryRoles.includes(role)) return "primary";
  if (player.secondaryRoles.includes(role)) return "secondary";
  return "autofill";
}

export function getRoleMmr(
  player: Player,
  role: Role,
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride
): number {
  const tier = getPlayerTier(player, role, overrides) ?? "C";
  const base = TIER_VALUES[tier];
  const preference = getRolePreference(player, role, rolePrefs);
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
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride
): AssignedPlayer {
  const hasRating = getPlayerTier(player, role, overrides) !== null;
  const tier = getPlayerTier(player, role, overrides) ?? "C";
  const preference = getRolePreference(player, role, rolePrefs);
  const prefs = resolveRolePrefs(rolePrefs, player.id);
  const autofilled =
    prefs.fill || preference === "autofill" || !hasRating;
  const generalTier = getGeneralTier(player, overrides);

  return {
    playerId: player.id,
    name: player.name,
    role,
    tier,
    mmr: getRoleMmr(player, role, overrides, rolePrefs),
    generalTier,
    generalMmr: getGeneralMmr(player, overrides),
    preference: autofilled ? "autofill" : preference,
    autofilled,
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
    generalMmr: ordered.reduce((sum, p) => sum + p.generalMmr, 0),
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
): { role: Role; tier: ActiveTier } | null {
  let best: { role: Role; tier: ActiveTier } | null = null;

  for (const role of ROLES) {
    const tier = getPlayerTier(player, role, overrides);
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
