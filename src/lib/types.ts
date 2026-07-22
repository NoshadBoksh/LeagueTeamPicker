export type Role = "top" | "jungle" | "mid" | "adc" | "support";

export type Tier = "S" | "A" | "B" | "C" | "D" | "F";

export type DraftMode = "competitive" | "role-consider" | "normal";

export type TeamSide = "blue" | "red";

export interface Player {
  id: string;
  name: string;
  primaryRoles: Role[];
  secondaryRoles: Role[];
  ratings: Partial<Record<Role, Tier>>;
}

export interface AssignedPlayer {
  playerId: string;
  name: string;
  role: Role;
  tier: Tier;
  mmr: number;
  preference: "primary" | "secondary" | "autofill";
  autofilled: boolean;
}

export interface Team {
  side: TeamSide;
  players: AssignedPlayer[];
  mmr: number;
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
  mmrDifference: number;
  balanceScore: number;
  favorite: TeamSide;
  underdog: TeamSide;
  blueWinChance: number;
  redWinChance: number;
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

export type RatingsOverride = Record<string, Partial<Record<Role, Tier>>>;

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

export const ROLE_LABELS: Record<Role, string> = {
  top: "Top",
  jungle: "Jungle",
  mid: "Mid",
  adc: "ADC",
  support: "Support",
};

export const MODE_LABELS: Record<DraftMode, string> = {
  competitive: "Competitive",
  "role-consider": "Role Consider",
  normal: "Normal",
};

export const TIERS: Tier[] = ["S", "A", "B", "C", "D", "F"];

export const TIER_VALUES: Record<Tier, number> = {
  S: 10,
  A: 8,
  B: 6,
  C: 4,
  D: 2,
  F: 1,
};

export const AUTOFILL_PENALTY = 0.65;
