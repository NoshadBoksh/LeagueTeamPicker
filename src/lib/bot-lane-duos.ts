import type { Role } from "@/lib/types";

const BOT_MATCHUP_PLAYER_IDS = ["gerard", "lily", "karthik", "gabriel"] as const;

/** Fixed roles when Gerard + Lily + Karthik + Gabriel are all in the lobby. */
export const BOT_MATCHUP_ROLES: Record<string, Role> = {
  gerard: "adc",
  karthik: "adc",
  lily: "support",
  gabriel: "support",
};

/** True when all four bot-matchup players are in tonight’s 10. */
export function isBotMatchupLobby(playerIds: string[]): boolean {
  return BOT_MATCHUP_PLAYER_IDS.every((id) => playerIds.includes(id));
}

export function isBotMatchupPlayer(playerId: string): boolean {
  return Object.prototype.hasOwnProperty.call(BOT_MATCHUP_ROLES, playerId);
}
