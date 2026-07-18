import type { Player } from "@/lib/types";

/**
 * Hardcoded friend-group roster for Customs Draft.
 * Photos live in /public/players/{id}.png
 * Roles & tiers are undecided for now — set them on /tierlist later.
 */
function undecided(id: string, name: string): Player {
  return {
    id,
    name,
    primaryRoles: [],
    secondaryRoles: [],
    ratings: {},
  };
}

export const PLAYERS: Player[] = [
  undecided("chara", "Chara"),
  undecided("karthik", "Karthik"),
  undecided("aman", "Aman"),
  undecided("ben", "Ben"),
  undecided("gabriel", "Gabriel"),
  undecided("gerard", "Gerard"),
  undecided("jonty", "Jonty"),
  undecided("joshuayeahh", "JoshuaYeahh"),
  undecided("kieran", "Kieran"),
  undecided("panda", "Panda"),
  undecided("laxus", "Laxus"),
  undecided("lukas", "Lukas"),
  undecided("noshad", "Noshad"),
  undecided("andre", "Andre"),
  undecided("mark", "Mark"),
  undecided("william", "William"),
];

/** Photo path for a player — drop PNGs in /public/players/ */
export function getPlayerPhotoPath(playerId: string): string {
  return `/players/${playerId}.png`;
}

export function getPlayerById(id: string): Player | undefined {
  return PLAYERS.find((p) => p.id === id);
}

export function getPlayersByIds(ids: string[]): Player[] {
  return ids
    .map((id) => getPlayerById(id))
    .filter((p): p is Player => Boolean(p));
}
