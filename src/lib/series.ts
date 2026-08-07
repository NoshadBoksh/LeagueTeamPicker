import type {
  AssignedPlayer,
  DraftResult,
  Series,
  TeamSide,
} from "@/lib/types";
import { uid } from "@/lib/utils";

export function getSeriesGames(
  series: Series,
  history: DraftResult[]
): DraftResult[] {
  const byId = new Map(history.map((d) => [d.id, d]));
  return series.draftIds
    .map((id) => byId.get(id))
    .filter((d): d is DraftResult => Boolean(d))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Count blue/red wins across games (sides are per-game lineups). */
export function getSeriesScore(
  series: Series,
  history: DraftResult[]
): { blue: number; red: number; played: number } {
  const games = getSeriesGames(series, history);
  let blue = 0;
  let red = 0;
  for (const g of games) {
    if (!g.result) continue;
    if (g.result.winner === "blue") blue += 1;
    else red += 1;
  }
  return { blue, red, played: blue + red };
}

/** True when one side has 2 wins or 3 games have results. */
export function isSeriesComplete(
  series: Series,
  history: DraftResult[]
): boolean {
  const { blue, red, played } = getSeriesScore(series, history);
  return blue >= 2 || red >= 2 || played >= 3;
}

/**
 * Clinching / spin game: last completed game once series is decided,
 * otherwise the latest game with a result.
 */
export function getSeriesSpinDraft(
  series: Series,
  history: DraftResult[]
): DraftResult | null {
  const games = getSeriesGames(series, history).filter((g) => g.result);
  if (games.length === 0) return null;

  let blue = 0;
  let red = 0;
  for (const g of games) {
    if (g.result!.winner === "blue") blue += 1;
    else red += 1;
    if (blue >= 2 || red >= 2) return g;
  }
  return games[games.length - 1] ?? null;
}

export function getWinningPlayers(
  draft: DraftResult
): AssignedPlayer[] {
  if (!draft.result) return [];
  return draft.result.winner === "blue"
    ? draft.blue.players
    : draft.red.players;
}

export function seriesScoreLabel(
  series: Series,
  history: DraftResult[]
): string {
  const { blue, red, played } = getSeriesScore(series, history);
  if (played === 0) return "No results yet";
  return `Blue ${blue} – ${red} Red`;
}

export function cloneDraftAsRematch(draft: DraftResult): DraftResult {
  return {
    ...draft,
    id: uid(),
    timestamp: Date.now(),
    result: undefined,
    seriesId: undefined,
  };
}

export function roleMapFromTeam(
  players: AssignedPlayer[]
): Record<"top" | "jungle" | "mid" | "adc" | "support", string> {
  const map = {
    top: "",
    jungle: "",
    mid: "",
    adc: "",
    support: "",
  };
  for (const p of players) {
    map[p.role] = p.playerId;
  }
  return map;
}

export function formatSeriesGameLine(
  draft: DraftResult,
  index: number
): string {
  const n = index + 1;
  if (!draft.result) return `Game ${n}: pending`;
  const winner: TeamSide = draft.result.winner;
  return `Game ${n}: ${winner === "blue" ? "Blue" : "Red"} won ${draft.result.blueScore}–${draft.result.redScore}`;
}
