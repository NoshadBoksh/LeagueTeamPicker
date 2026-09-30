import { getPlayersByIds } from "@/data/players";
import {
  isBotMatchupLobby,
  isBotMatchupPlayer,
} from "@/lib/bot-lane-duos";
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
  AvoidPairs,
  DraftMode,
  DraftResult,
  Player,
  RatingsOverride,
  Role,
  RolePrefsOverride,
  Team,
} from "@/lib/types";
import { ROLES } from "@/lib/types";
import { shuffle, uid } from "@/lib/utils";

function violatesAvoidPairs(
  blue: AssignedPlayer[],
  red: AssignedPlayer[],
  avoidPairs?: AvoidPairs
): boolean {
  if (!avoidPairs?.length) return false;
  const blueIds = new Set(blue.map((p) => p.playerId));
  const redIds = new Set(red.map((p) => p.playerId));
  for (const { a, b } of avoidPairs) {
    if (
      (blueIds.has(a) && blueIds.has(b)) ||
      (redIds.has(a) && redIds.has(b))
    ) {
      return true;
    }
  }
  return false;
}

type RoleMap = Record<Role, Player>;

function preferenceScore(
  player: Player,
  role: Role,
  rolePrefs?: RolePrefsOverride
): number {
  const pref = getRolePreference(player, role, rolePrefs);
  if (pref === "primary") return 0;
  if (pref === "secondary") return 3;
  return 12;
}

function assignmentCost(
  map: RoleMap,
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride
): number {
  let cost = 0;
  for (const role of ROLES) {
    const player = map[role];
    cost += preferenceScore(player, role, rolePrefs);
    if (!canPlayRole(player, role, overrides, rolePrefs)) cost += 1000;
  }
  return cost;
}

/**
 * Assign roles for 5 players using only allowed roles (selected or FILL).
 * Returns null when no legal covering exists — never forces a forbidden role.
 */
export function assignRoles(
  players: Player[],
  overrides?: RatingsOverride,
  randomize = false,
  rolePrefs?: RolePrefsOverride
): AssignedPlayer[] | null {
  if (players.length !== 5) {
    throw new Error("Role assignment requires exactly 5 players");
  }

  const orderedPlayers = randomize ? shuffle(players) : [...players];

  let best: RoleMap | null = null;
  let bestCost = Infinity;

  function search(
    index: number,
    usedRoles: Set<Role>,
    current: Partial<RoleMap>
  ) {
    if (index === orderedPlayers.length) {
      const map = current as RoleMap;
      const cost = assignmentCost(map, overrides, rolePrefs);
      const jitter = randomize ? Math.random() * 0.5 : 0;
      if (cost + jitter < bestCost) {
        bestCost = cost + jitter;
        best = { ...map };
      }
      return;
    }

    const player = orderedPlayers[index];
    const playable = ROLES.filter((role) =>
      canPlayRole(player, role, overrides, rolePrefs)
    );
    const candidates = playable.filter((role) => !usedRoles.has(role));
    if (candidates.length === 0) return;

    const ranked = [...candidates].sort((a, b) => {
      const pa = preferenceScore(player, a, rolePrefs);
      const pb = preferenceScore(player, b, rolePrefs);
      if (pa !== pb) return pa - pb;
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
  if (!best) return null;

  return ROLES.map((role) =>
    toAssignedPlayer(best![role], role, overrides, rolePrefs)
  );
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
  const generalChances = computeWinChances(blue.generalMmr, red.generalMmr);
  const generalFavorite = getFavorite(blue.generalMmr, red.generalMmr);

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
    generalMmrDifference: Math.abs(blue.generalMmr - red.generalMmr),
    generalBalanceScore: computeBalanceScore(blue.generalMmr, red.generalMmr),
    generalFavorite,
    generalUnderdog: generalFavorite === "blue" ? "red" : "blue",
    generalBlueWinChance: generalChances.blue,
    generalRedWinChance: generalChances.red,
    playerIds: [...playerIds],
  };
}

/** Pure random roles — ignores role prefs entirely (Normal mode). */
function assignRolesBlind(players: Player[]): AssignedPlayer[] {
  const roles = shuffle([...ROLES]);
  return shuffle(players).map((player, i) => ({
    playerId: player.id,
    name: player.name,
    role: roles[i],
    tier: "C" as const,
    mmr: 0,
    generalTier: null,
    generalMmr: 0,
    preference: "autofill" as const,
    autofilled: false,
  }));
}

/**
 * Assign 5 players with some roles locked by player id
 * (used for Gerard ADC / Lily Support / Karthik ADC / Gabriel Support).
 */
function assignRolesWithFixed(
  players: Player[],
  fixedByPlayerId: Record<string, Role>,
  overrides?: RatingsOverride,
  randomize = false,
  rolePrefs?: RolePrefsOverride,
  blind = false
): AssignedPlayer[] | null {
  if (players.length !== 5) {
    throw new Error("Role assignment requires exactly 5 players");
  }

  const map: Partial<RoleMap> = {};
  const usedRoles = new Set<Role>();

  for (const player of players) {
    const locked = fixedByPlayerId[player.id];
    if (!locked) continue;
    if (usedRoles.has(locked)) return null;
    map[locked] = player;
    usedRoles.add(locked);
  }

  const flexPlayers = players.filter((p) => !fixedByPlayerId[p.id]);
  const openRoles = ROLES.filter((r) => !usedRoles.has(r));
  if (flexPlayers.length !== openRoles.length) return null;

  if (blind) {
    const roles = shuffle(openRoles);
    const order = shuffle(flexPlayers);
    order.forEach((player, i) => {
      map[roles[i]] = player;
    });
    return ROLES.map((role) => {
      const player = map[role]!;
      return {
        playerId: player.id,
        name: player.name,
        role,
        tier: "C" as const,
        mmr: 0,
        generalTier: null,
        generalMmr: 0,
        preference: "autofill" as const,
        autofilled: false,
      };
    });
  }

  const orderedFlex = randomize ? shuffle(flexPlayers) : [...flexPlayers];
  let best: RoleMap | null = null;
  let bestCost = Infinity;

  function search(
    index: number,
    taken: Set<Role>,
    current: Partial<RoleMap>
  ) {
    if (index === orderedFlex.length) {
      const full = current as RoleMap;
      const cost = assignmentCost(full, overrides, rolePrefs);
      const jitter = randomize ? Math.random() * 0.5 : 0;
      if (cost + jitter < bestCost) {
        bestCost = cost + jitter;
        best = { ...full };
      }
      return;
    }

    const player = orderedFlex[index];
    const playable = openRoles.filter(
      (role) =>
        !taken.has(role) && canPlayRole(player, role, overrides, rolePrefs)
    );
    const ranked = [...playable].sort((a, b) => {
      const pa = preferenceScore(player, a, rolePrefs);
      const pb = preferenceScore(player, b, rolePrefs);
      if (pa !== pb) return pa - pb;
      return randomize ? Math.random() - 0.5 : 0;
    });

    for (const role of ranked) {
      taken.add(role);
      current[role] = player;
      search(index + 1, taken, current);
      delete current[role];
      taken.delete(role);
      if (bestCost === 0 && !randomize) return;
    }
  }

  search(0, new Set(usedRoles), { ...map });
  if (!best) return null;

  return ROLES.map((role) =>
    toAssignedPlayer(best![role], role, overrides, rolePrefs)
  );
}

function fixedRolesForDuo(
  includesGerardLily: boolean
): Record<string, Role> {
  return includesGerardLily
    ? { gerard: "adc", lily: "support" }
    : { karthik: "adc", gabriel: "support" };
}

/**
 * When Gerard, Lily, Karthik, and Gabriel are all in the 10:
 * Gerard+Lily bot (ADC/Support) vs Karthik+Gabriel bot (ADC/Support).
 */
function tryGenerateBotMatchupDraft(
  mode: DraftMode,
  players: Player[],
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride,
  avoidPairs?: AvoidPairs
): DraftResult | null {
  if (!isBotMatchupLobby(players.map((p) => p.id))) return null;

  const byId = new Map(players.map((p) => [p.id, p]));
  const rest = players.filter((p) => !isBotMatchupPlayer(p.id));
  if (rest.length !== 6) return null;

  const attempts = mode === "competitive" ? 600 : 300;
  let bestScore = Infinity;
  let bestBlue: AssignedPlayer[] | null = null;
  let bestRed: AssignedPlayer[] | null = null;

  for (let i = 0; i < attempts; i++) {
    const shuffled = shuffle(rest);
    const left3 = shuffled.slice(0, 3);
    const right3 = shuffled.slice(3);
    const glIsBlue = Math.random() < 0.5;

    const bluePlayers = glIsBlue
      ? [byId.get("gerard")!, byId.get("lily")!, ...left3]
      : [byId.get("karthik")!, byId.get("gabriel")!, ...left3];
    const redPlayers = glIsBlue
      ? [byId.get("karthik")!, byId.get("gabriel")!, ...right3]
      : [byId.get("gerard")!, byId.get("lily")!, ...right3];

    const blueFixed = fixedRolesForDuo(glIsBlue);
    const redFixed = fixedRolesForDuo(!glIsBlue);

    const blind = mode === "normal";
    const randomize = mode !== "competitive";

    const blue = assignRolesWithFixed(
      bluePlayers,
      blueFixed,
      overrides,
      randomize,
      rolePrefs,
      blind
    );
    const red = assignRolesWithFixed(
      redPlayers,
      redFixed,
      overrides,
      randomize,
      rolePrefs,
      blind
    );
    if (!blue || !red) continue;
    if (violatesAvoidPairs(blue, red, avoidPairs)) continue;

    if (mode === "competitive") {
      const score = scoreCompetitiveSplit(blue, red);
      if (score < bestScore) {
        bestScore = score;
        bestBlue = blue;
        bestRed = red;
      }
      continue;
    }

    return finalizeDraft(mode, blue, red, players.map((p) => p.id));
  }

  if (mode === "competitive" && bestBlue && bestRed) {
    return finalizeDraft(
      "competitive",
      bestBlue,
      bestRed,
      players.map((p) => p.id)
    );
  }

  return null;
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
 * Skips splits that would force a forbidden role.
 */
export function generateCompetitiveDraft(
  players: Player[],
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride,
  avoidPairs?: AvoidPairs
): DraftResult {
  if (players.length !== 10) {
    throw new Error("Competitive draft requires exactly 10 players");
  }

  const forced = tryGenerateBotMatchupDraft(
    "competitive",
    players,
    overrides,
    rolePrefs,
    avoidPairs
  );
  if (forced) return forced;

  let bestScore = Infinity;
  let bestBlue: AssignedPlayer[] | null = null;
  let bestRed: AssignedPlayer[] | null = null;

  const attempts = 600;

  for (let i = 0; i < attempts; i++) {
    const shuffled = shuffle(players);
    const groupA = shuffled.slice(0, 5);
    const groupB = shuffled.slice(5);

    const blue = assignRoles(groupA, overrides, false, rolePrefs);
    const red = assignRoles(groupB, overrides, false, rolePrefs);
    if (!blue || !red) continue;
    if (violatesAvoidPairs(blue, red, avoidPairs)) continue;

    const score = scoreCompetitiveSplit(blue, red);
    if (score < bestScore) {
      bestScore = score;
      bestBlue = blue;
      bestRed = red;
    }

    const swapped = scoreCompetitiveSplit(red, blue);
    if (swapped < bestScore) {
      bestScore = swapped;
      bestBlue = red;
      bestRed = blue;
    }
  }

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

        const nb = assignRoles(newBluePlayers, overrides, false, rolePrefs);
        const nr = assignRoles(newRedPlayers, overrides, false, rolePrefs);
        if (!nb || !nr) continue;
        if (violatesAvoidPairs(nb, nr, avoidPairs)) continue;

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

  if (!bestBlue || !bestRed) {
    throw new Error(
      "Could not build teams with current role / keep-apart rules. Loosen FILL, roles, or avoid pairs."
    );
  }

  return finalizeDraft(
    "competitive",
    bestBlue,
    bestRed,
    players.map((p) => p.id)
  );
}

/**
 * Role Consider: random teams that still respect playable roles.
 */
export function generateRoleConsiderDraft(
  players: Player[],
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride,
  avoidPairs?: AvoidPairs
): DraftResult {
  if (players.length !== 10) {
    throw new Error("Role Consider draft requires exactly 10 players");
  }

  const forced = tryGenerateBotMatchupDraft(
    "role-consider",
    players,
    overrides,
    rolePrefs,
    avoidPairs
  );
  if (forced) return forced;

  for (let attempt = 0; attempt < 300; attempt++) {
    const shuffled = shuffle(players);
    const blue = assignRoles(shuffled.slice(0, 5), overrides, true, rolePrefs);
    const red = assignRoles(shuffled.slice(5), overrides, true, rolePrefs);
    if (!blue || !red) continue;
    if (violatesAvoidPairs(blue, red, avoidPairs)) continue;

    return finalizeDraft(
      "role-consider",
      blue,
      red,
      players.map((p) => p.id)
    );
  }

  throw new Error(
    "Could not build teams with current role / keep-apart rules. Loosen FILL, roles, or avoid pairs."
  );
}

/**
 * Normal: anyone anywhere. No role prefs, MMR, or tier fairness.
 */
export function generateNormalDraft(
  players: Player[],
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride,
  avoidPairs?: AvoidPairs
): DraftResult {
  if (players.length !== 10) {
    throw new Error("Normal draft requires exactly 10 players");
  }

  const forced = tryGenerateBotMatchupDraft(
    "normal",
    players,
    overrides,
    rolePrefs,
    avoidPairs
  );
  if (forced) return forced;

  const shuffled = shuffle(players);
  const blue = assignRolesBlind(shuffled.slice(0, 5));
  const red = assignRolesBlind(shuffled.slice(5));

  return finalizeDraft("normal", blue, red, players.map((p) => p.id));
}

export function generateDraft(
  mode: DraftMode,
  players: Player[],
  overrides?: RatingsOverride,
  rolePrefs?: RolePrefsOverride,
  avoidPairs?: AvoidPairs
): DraftResult {
  if (mode === "competitive" || mode === "manual") {
    return generateCompetitiveDraft(players, overrides, rolePrefs, avoidPairs);
  }
  if (mode === "role-consider") {
    return generateRoleConsiderDraft(players, overrides, rolePrefs, avoidPairs);
  }
  return generateNormalDraft(players, overrides, rolePrefs, avoidPairs);
}

/** Build a draft from exact role lineups (for past games / manual history). */
export function createManualDraft(input: {
  blue: Record<Role, string>;
  red: Record<Role, string>;
  overrides?: RatingsOverride;
  rolePrefs?: RolePrefsOverride;
  timestamp?: number;
}): DraftResult {
  const blueIds = ROLES.map((role) => input.blue[role]);
  const redIds = ROLES.map((role) => input.red[role]);
  const allIds = [...blueIds, ...redIds];

  if (allIds.some((id) => !id)) {
    throw new Error("Pick a player for every role on both teams");
  }
  if (new Set(allIds).size !== 10) {
    throw new Error("Each player can only be on one team / role");
  }

  const byId = new Map(getPlayersByIds(allIds).map((p) => [p.id, p]));
  if (byId.size !== 10) {
    throw new Error("Unknown player in lineup");
  }

  const blue = ROLES.map((role) =>
    toAssignedPlayer(
      byId.get(input.blue[role])!,
      role,
      input.overrides,
      input.rolePrefs
    )
  );
  const red = ROLES.map((role) =>
    toAssignedPlayer(
      byId.get(input.red[role])!,
      role,
      input.overrides,
      input.rolePrefs
    )
  );

  const draft = finalizeDraft("manual", blue, red, allIds);
  if (input.timestamp != null) {
    draft.timestamp = input.timestamp;
  }
  return draft;
}

export function teamToRoleLines(team: Team): string[] {
  return team.players.map(
    (p) =>
      `${p.role.toUpperCase()}: ${p.name} (${p.tier})${p.autofilled ? " [AUTOFILL]" : ""}`
  );
}
