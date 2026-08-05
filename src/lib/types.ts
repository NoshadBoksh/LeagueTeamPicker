export type Role = "top" | "jungle" | "mid" | "adc" | "support";

/** Role lanes plus overall player strength. */
export type RatingKey = Role | "general";

/** Active tiers are S–C. D/F remain only for legacy localStorage coercion. */
export type Tier = "S" | "A" | "B" | "C" | "D" | "F";
export type ActiveTier = "S" | "A" | "B" | "C";

export type DraftMode = "competitive" | "role-consider" | "normal";

export type TeamSide = "blue" | "red";

export interface Player {
  id: string;
  name: string;
  primaryRoles: Role[];
  secondaryRoles: Role[];
  ratings: Partial<Record<RatingKey, Tier>>;
}

export interface AssignedPlayer {
  playerId: string;
  name: string;
  role: Role;
  /** Tier for the assigned role. */
  tier: Tier;
  /** Role-based MMR for the assigned role. */
  mmr: number;
  /** Overall player tier from the General list (null if unranked). */
  generalTier: Tier | null;
  /** Overall player MMR from the General list. */
  generalMmr: number;
  preference: "primary" | "secondary" | "autofill";
  autofilled: boolean;
}

export interface Team {
  side: TeamSide;
  players: AssignedPlayer[];
  /** Sum of role-based MMR. */
  mmr: number;
  /** Sum of general MMR. */
  generalMmr: number;
}

export interface GameResult {
  winner: TeamSide;
  blueScore: number;
  redScore: number;
  /** Compressed data URL of the post-game leaderboard screenshot */
  leaderboardImage?: string;
  recordedAt: number;
}

export interface DraftResult {
  id: string;
  mode: DraftMode;
  timestamp: number;
  blue: Team;
  red: Team;
  /** Role-MMR difference / balance / favorite. */
  mmrDifference: number;
  balanceScore: number;
  favorite: TeamSide;
  underdog: TeamSide;
  blueWinChance: number;
  redWinChance: number;
  /** General-MMR difference / balance / favorite (overall player strength). */
  generalMmrDifference: number;
  generalBalanceScore: number;
  generalFavorite: TeamSide;
  generalUnderdog: TeamSide;
  generalBlueWinChance: number;
  generalRedWinChance: number;
  playerIds: string[];
  /** Filled in after the custom game finishes */
  result?: GameResult;
}

export interface PlayerStats {
  playerId: string;
  totalGames: number;
  blueAppearances: number;
  redAppearances: number;
  autofillCount: number;
  wins: number;
  losses: number;
  roleCounts: Record<Role, number>;
  teammateCounts: Record<string, number>;
  opponentCounts: Record<string, number>;
}

export type RatingsOverride = Record<string, Partial<Record<RatingKey, Tier>>>;

/** Per-player role assignment prefs (separate from tier list ratings). */
export interface PlayerRolePrefs {
  /** Roles this player is allowed to play when fill is off. */
  roles: Role[];
  /** Play anywhere — ignores `roles` and can take any lane. */
  fill: boolean;
}

export type RolePrefsOverride = Record<string, PlayerRolePrefs>;

export const DEFAULT_ROLE_PREFS: PlayerRolePrefs = {
  roles: [],
  fill: true,
};

export const ROLES: Role[] = ["top", "jungle", "mid", "adc", "support"];

export const RATING_KEYS: RatingKey[] = [
  "general",
  "top",
  "jungle",
  "mid",
  "adc",
  "support",
];

export const ROLE_LABELS: Record<Role, string> = {
  top: "Top",
  jungle: "Jungle",
  mid: "Mid",
  adc: "ADC",
  support: "Support",
};

export const RATING_LABELS: Record<RatingKey, string> = {
  general: "General",
  ...ROLE_LABELS,
};

export const MODE_LABELS: Record<DraftMode, string> = {
  competitive: "Competitive",
  "role-consider": "Role Consider",
  normal: "Normal",
};

/** Tiers shown in the tier list UI (D/F removed). */
export const TIERS: ActiveTier[] = ["S", "A", "B", "C"];

export const TIER_VALUES: Record<Tier, number> = {
  S: 10,
  A: 8,
  B: 6,
  C: 4,
  D: 4, // legacy → treat like C
  F: 4, // legacy → treat like C
};

/** Coerce legacy D/F ratings into C. */
export function normalizeTier(tier: Tier | null | undefined): ActiveTier | null {
  if (!tier) return null;
  if (tier === "D" || tier === "F") return "C";
  return tier;
}

export const AUTOFILL_PENALTY = 0.65;

/** Sorted pair of player ids that should not share a team. */
export interface AvoidPair {
  a: string;
  b: string;
}

export type AvoidPairs = AvoidPair[];

export function makeAvoidPair(id1: string, id2: string): AvoidPair | null {
  if (id1 === id2) return null;
  return id1 < id2 ? { a: id1, b: id2 } : { a: id2, b: id1 };
}

export function avoidPairKey(pair: AvoidPair): string {
  return `${pair.a}|${pair.b}`;
}

/** Points needed to cash in for a mystery prize. */
export const MYSTERY_PRIZE_COST = 3;

export type PrizeLogKind = "spin" | "cashin";

export interface PrizeLogEntry {
  id: string;
  kind: PrizeLogKind;
  playerId: string;
  playerName: string;
  /** +1 for spin, −cost for cash-in. */
  delta: number;
  pointsAfter: number;
  at: number;
  /** Optional draft the spin came from. */
  draftId?: string;
  /** Names on the spun winning team. */
  teamNames?: string[];
  /** Label for cash-in (mystery prize). */
  prizeLabel?: string;
}

export type PrizePoints = Record<string, number>;

