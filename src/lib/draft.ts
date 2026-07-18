import {
  buildTeam,
  canPlayRole,
  computeBalanceScore,
  computeWinChances,
  getFavorite,
  getRolePreference,
  toAssignedPlayer,
} from "@/lib/ratings";
import type {
  AssignedPlayer,
  DraftMode,
  DraftResult,
  Player,
  RatingsOverride,
  Role,
  Team,
} from "@/lib/types";
import { ROLES } from "@/lib/types";
import { shuffle, uid } from "@/lib/utils";

type RoleMap = Record<Role, Player>;

function preferenceScore(player: Player, role: Role): number {
  const pref = getRolePreference(player, role);
  if (pref === "primary") return 0;
  if (pref === "secondary") return 3;
  return 12;
}

function assignmentCost(
  map: RoleMap,
  overrides?: RatingsOverride
): number {
  let cost = 0;
  for (const role of ROLES) {
    const player = map[role];
    cost += preferenceScore(player, role);
    if (!canPlayRole(player, role, overrides)) cost += 100;
  }
  return cost;
}

/**
 * Find a low-cost role assignment for 5 players.
 * Prefers primary > secondary > autofill. Unavailable roles are avoided
 * whenever a valid playable-role solution exists.
 */
export function assignRoles(
  players: Player[],
  overrides?: RatingsOverride,
  randomize = false
): AssignedPlayer[] {
  if (players.length !== 5) {
    throw new Error("Role assignment requires exactly 5 players");
  }

  const orderedPlayers = randomize ? shuffle(players) : [...players];

  function solve(allowUnavailable: boolean): RoleMap | null {
    let best: RoleMap | null = null;
    let bestCost = Infinity;

    function search(
      index: number,
      usedRoles: Set<Role>,
      current: Partial<RoleMap>
    ) {
      if (index === orderedPlayers.length) {
        const map = current as RoleMap;
        const cost = assignmentCost(map, overrides);
        const jitter = randomize ? Math.random() * 0.5 : 0;
        if (cost + jitter < bestCost) {
          bestCost = cost + jitter;
          best = { ...map };
        }
        return;
      }

      const player = orderedPlayers[index];
      const playable = ROLES.filter((role) =>
        canPlayRole(player, role, overrides)
      );
      const freeRoles = ROLES.filter((role) => !usedRoles.has(role));
      const candidates =
        playable.length > 0
          ? playable.filter((role) => !usedRoles.has(role))
          : allowUnavailable
            ? freeRoles
            : [];

      // If all playable roles are taken, escalate only when allowed
      const pool =
        candidates.length > 0
          ? candidates
          : allowUnavailable
            ? freeRoles
            : [];

      const ranked = [...pool].sort((a, b) => {
        const pa = preferenceScore(player, a);
        const pb = preferenceScore(player, b);
        if (pa !== pb) return pa - pb;
        const playableA = canPlayRole(player, a, overrides) ? 0 : 1;
        const playableB = canPlayRole(player, b, overrides) ? 0 : 1;
        if (playableA !== playableB) return playableA - playableB;
        return randomize ? Math.random() - 0.5 : 0;
      });

      for (const role of ranked) {
        usedRoles.add(role);
        current[role] = player;
        search(index + 1, usedRoles, current);
        delete current[role];
        usedRoles.delete(role);

        if (bestCost === 0 && !randomize) return;
      }
    }

    search(0, new Set(), {});
    return best;
  }

  const best = solve(false) ?? solve(true);

  if (!best) {
    const fallback = orderedPlayers.map((player, i) =>
      toAssignedPlayer(player, ROLES[i], overrides)
    );
    return fallback;
  }

  return ROLES.map((role) => toAssignedPlayer(best[role], role, overrides));
}

function finalizeDraft(
  mode: DraftMode,
  blueAssignments: AssignedPlayer[],
  redAssignments: AssignedPlayer[],
  playerIds: string[]
): DraftResult {
  const blue = buildTeam("blue", blueAssignments);
  const red = buildTeam("red", redAssignments);
  const chances = computeWinChances(blue.mmr, red.mmr);
  const favorite = getFavorite(blue.mmr, red.mmr);

  return {
    id: uid(),
    mode,
    timestamp: Date.now(),
    blue,
    red,
    mmrDifference: Math.abs(blue.mmr - red.mmr),
    balanceScore: computeBalanceScore(blue.mmr, red.mmr),
    favorite,
    underdog: favorite === "blue" ? "red" : "blue",
    blueWinChance: chances.blue,
    redWinChance: chances.red,
    playerIds: [...playerIds],
  };
}

/** Pure random roles — ignores primary/secondary/playable entirely. */
function assignRolesBlind(players: Player[]): AssignedPlayer[] {
  const roles = shuffle([...ROLES]);
  return shuffle(players).map((player, i) => ({
    playerId: player.id,
    name: player.name,
    role: roles[i],
    tier: "C" as const,
    mmr: 0,
    preference: "autofill" as const,
    autofilled: false,
  }));
}

function scoreCompetitiveSplit(
  blue: AssignedPlayer[],
  red: AssignedPlayer[]
): number {
  const blueMmr = blue.reduce((s, p) => s + p.mmr, 0);
  const redMmr = red.reduce((s, p) => s + p.mmr, 0);
  const mmrDiff = Math.abs(blueMmr - redMmr);

  const autofills =
    blue.filter((p) => p.autofilled).length +
    red.filter((p) => p.autofilled).length;

  const secondary =
    blue.filter((p) => p.preference === "secondary").length +
    red.filter((p) => p.preference === "secondary").length;

  // Role mirror quality: reward similar role tiers across sides
  let roleMirror = 0;
  for (const role of ROLES) {
    const b = blue.find((p) => p.role === role)!;
    const r = red.find((p) => p.role === role)!;
    roleMirror += Math.abs(b.mmr - r.mmr);
  }

  return mmrDiff * 4 + autofills * 25 + secondary * 2 + roleMirror;
}

/**
 * Competitive mode: search many partitions for fairest balanced teams.
 */
export function generateCompetitiveDraft(
  players: Player[],
  overrides?: RatingsOverride
): DraftResult {
  if (players.length !== 10) {
    throw new Error("Competitive draft requires exactly 10 players");
  }

  let bestScore = Infinity;
  let bestBlue: AssignedPlayer[] | null = null;
  let bestRed: AssignedPlayer[] | null = null;

  const attempts = 400;

  for (let i = 0; i < attempts; i++) {
    const shuffled = shuffle(players);
    const groupA = shuffled.slice(0, 5);
    const groupB = shuffled.slice(5);

    const blue = assignRoles(groupA, overrides, false);
    const red = assignRoles(groupB, overrides, false);
    const score = scoreCompetitiveSplit(blue, red);

    if (score < bestScore) {
      bestScore = score;
      bestBlue = blue;
      bestRed = red;
    }

    // Also try swapped groups (same players, other side)
    const swapped = scoreCompetitiveSplit(red, blue);
    if (swapped < bestScore) {
      bestScore = swapped;
      bestBlue = red;
      bestRed = blue;
    }
  }

  // Greedy improvement: try swapping one player from each side by role
  if (bestBlue && bestRed) {
    for (let pass = 0; pass < 3; pass++) {
      let improved = false;
      for (const role of ROLES) {
        const bluePlayer = players.find(
          (p) => p.id === bestBlue!.find((a) => a.role === role)!.playerId
        )!;
        const redPlayer = players.find(
          (p) => p.id === bestRed!.find((a) => a.role === role)!.playerId
        )!;

        const blueIds = new Set(bestBlue.map((p) => p.playerId));
        const newBluePlayers = players.filter(
          (p) =>
            (blueIds.has(p.id) && p.id !== bluePlayer.id) ||
            p.id === redPlayer.id
        );
        const newRedPlayers = players.filter(
          (p) =>
            (!blueIds.has(p.id) && p.id !== redPlayer.id) ||
            p.id === bluePlayer.id
        );

        const nb = assignRoles(newBluePlayers, overrides, false);
        const nr = assignRoles(newRedPlayers, overrides, false);
        const score = scoreCompetitiveSplit(nb, nr);

        if (score < bestScore) {
          bestScore = score;
          bestBlue = nb;
          bestRed = nr;
          improved = true;
        }
      }
      if (!improved) break;
    }
  }

  return finalizeDraft(
    "competitive",
    bestBlue!,
    bestRed!,
    players.map((p) => p.id)
  );
}

/**
 * Role Consider: random teams, but still respect playable roles.
 */
export function generateRoleConsiderDraft(
  players: Player[],
  overrides?: RatingsOverride
): DraftResult {
  if (players.length !== 10) {
    throw new Error("Role Consider draft requires exactly 10 players");
  }

  const shuffled = shuffle(players);
  const blue = assignRoles(shuffled.slice(0, 5), overrides, true);
  const red = assignRoles(shuffled.slice(5), overrides, true);

  return finalizeDraft(
    "role-consider",
    blue,
    red,
    players.map((p) => p.id)
  );
}

/**
 * Normal: anyone anywhere. No role prefs, MMR, or tier fairness.
 */
export function generateNormalDraft(players: Player[]): DraftResult {
  if (players.length !== 10) {
    throw new Error("Normal draft requires exactly 10 players");
  }

  const shuffled = shuffle(players);
  const blue = assignRolesBlind(shuffled.slice(0, 5));
  const red = assignRolesBlind(shuffled.slice(5));

  return finalizeDraft("normal", blue, red, players.map((p) => p.id));
}

export function generateDraft(
  mode: DraftMode,
  players: Player[],
  overrides?: RatingsOverride
): DraftResult {
  if (mode === "competitive") {
    return generateCompetitiveDraft(players, overrides);
  }
  if (mode === "role-consider") {
    return generateRoleConsiderDraft(players, overrides);
  }
  return generateNormalDraft(players);
}

export function teamToRoleLines(team: Team): string[] {
  return team.players.map(
    (p) =>
      `${p.role.toUpperCase()}: ${p.name} (${p.tier})${p.autofilled ? " [AUTOFILL]" : ""}`
  );
}
