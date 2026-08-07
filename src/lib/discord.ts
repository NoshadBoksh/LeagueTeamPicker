import type {
  DraftResult,
  PrizeLogEntry,
  Series,
} from "@/lib/types";
import { MODE_LABELS, ROLE_LABELS } from "@/lib/types";
import type { Team } from "@/lib/types";
import {
  formatSeriesGameLine,
  getSeriesGames,
  getSeriesSpinDraft,
  seriesScoreLabel,
} from "@/lib/series";

function formatTeam(team: Team, label: string, includeRatings: boolean): string {
  const header = includeRatings
    ? `**${label}** (Role MMR: ${team.mmr} · General: ${team.generalMmr})`
    : `**${label}**`;

  const lines = [
    header,
    ...team.players.map((p) => {
      if (!includeRatings) {
        return `• **${ROLE_LABELS[p.role]}**: ${p.name}`;
      }
      const autofill = p.autofilled ? " — AUTOFILLED" : "";
      const general = p.generalTier ? ` · Gen ${p.generalTier}` : "";
      return `• **${ROLE_LABELS[p.role]}**: ${p.name} (${p.tier}${general})${autofill}`;
    }),
  ];
  return lines.join("\n");
}

export function formatDraftForDiscord(draft: DraftResult): string {
  const includeRatings = draft.mode !== "normal";
  const header = [`⚔️ **Customs Draft — ${MODE_LABELS[draft.mode]}**`];

  if (includeRatings) {
    header.push(
      `Role: Favorite ${draft.favorite === "blue" ? "Blue" : "Red"} · ${draft.blueWinChance}–${draft.redWinChance}`,
      `General: Favorite ${draft.generalFavorite === "blue" ? "Blue" : "Red"} · ${draft.generalBlueWinChance}–${draft.generalRedWinChance}`
    );
  }

  if (draft.result) {
    header.push(
      `Result: **${draft.result.winner === "blue" ? "Blue" : "Red"}** won ${draft.result.blueScore}–${draft.result.redScore}`
    );
  }

  return [
    ...header,
    "",
    formatTeam(draft.blue, "🔵 BLUE TEAM", includeRatings),
    "",
    formatTeam(draft.red, "🔴 RED TEAM", includeRatings),
  ].join("\n");
}

function nightKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Games from the same calendar day as the newest history entry (or `dayTs`). */
export function getNightDrafts(
  history: DraftResult[],
  dayTs?: number
): DraftResult[] {
  if (history.length === 0) return [];
  const anchor = dayTs ?? Math.max(...history.map((d) => d.timestamp));
  const key = nightKey(anchor);
  return history
    .filter((d) => nightKey(d.timestamp) === key)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function formatNightSummary(input: {
  history: DraftResult[];
  series?: Series[];
  prizeLog?: PrizeLogEntry[];
  dayTs?: number;
}): string {
  const night = getNightDrafts(input.history, input.dayTs);
  if (night.length === 0) {
    return "📋 **Customs night** — no games recorded yet.";
  }

  const dayLabel = new Date(night[0].timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const lines: string[] = [
    `📋 **Customs night — ${dayLabel}**`,
    `${night.length} game${night.length === 1 ? "" : "s"} recorded`,
    "",
  ];

  night.forEach((draft, i) => {
    const includeRatings = draft.mode !== "normal";
    lines.push(
      `**Game ${i + 1}** · ${MODE_LABELS[draft.mode]} · ${new Date(draft.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    );

    if (includeRatings) {
      const roleFav = draft.favorite === "blue" ? "Blue" : "Red";
      const actual = draft.result
        ? draft.result.winner === "blue"
          ? "Blue"
          : "Red"
        : "—";
      const upset =
        draft.result && draft.result.winner !== draft.favorite
          ? " · ⚡ upset vs Role favorite"
          : "";
      lines.push(
        `Role favorite: ${roleFav} (${draft.blueWinChance}–${draft.redWinChance}) · Actual: **${actual}**${upset}`
      );
    }

    if (draft.result) {
      lines.push(
        `Score: **${draft.result.blueScore} – ${draft.result.redScore}** (${draft.result.winner === "blue" ? "Blue" : "Red"} win)`
      );
    } else {
      lines.push("Score: pending");
    }

    const blueNames = draft.blue.players.map((p) => p.name).join(", ");
    const redNames = draft.red.players.map((p) => p.name).join(", ");
    lines.push(`🔵 ${blueNames}`);
    lines.push(`🔴 ${redNames}`);
    lines.push("");
  });

  const seriesList = (input.series ?? []).filter((s) =>
    s.draftIds.some((id) => night.some((d) => d.id === id))
  );

  if (seriesList.length > 0) {
    lines.push("**Series**");
    for (const s of seriesList) {
      const score = seriesScoreLabel(s, input.history);
      lines.push(`• ${s.label}: ${score}`);
      getSeriesGames(s, input.history).forEach((g, idx) => {
        lines.push(`  – ${formatSeriesGameLine(g, idx)}`);
      });
      if (s.spunPlayerName) {
        lines.push(`  – Prize spin: **${s.spunPlayerName} +1**`);
      }
    }
    lines.push("");
  }

  const nightStart = night[0].timestamp;
  const nightEnd = night[night.length - 1].timestamp + 12 * 60 * 60 * 1000;
  const spins = (input.prizeLog ?? []).filter(
    (e) =>
      e.kind === "spin" &&
      e.at >= nightStart - 2 * 60 * 60 * 1000 &&
      e.at <= nightEnd
  );

  if (spins.length > 0) {
    lines.push("**Prize points tonight**");
    for (const s of spins) {
      lines.push(`• ${s.playerName} +1`);
    }
    lines.push("");
  }

  // Quick tip from clincher of first series if present
  const firstSeries = seriesList[0];
  if (firstSeries) {
    const clincher = getSeriesSpinDraft(firstSeries, input.history);
    if (clincher?.result) {
      const winners =
        clincher.result.winner === "blue"
          ? clincher.blue.players
          : clincher.red.players;
      lines.push(
        `Series spin pool: ${winners.map((p) => p.name).join(", ")}`
      );
    }
  }

  return lines.join("\n").trim();
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
