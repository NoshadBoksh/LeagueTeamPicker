import type { DraftResult, Team } from "@/lib/types";
import { MODE_LABELS, ROLE_LABELS } from "@/lib/types";

function formatTeam(team: Team, label: string, includeRatings: boolean): string {
  const header = includeRatings
    ? `**${label}** (MMR: ${team.mmr})`
    : `**${label}**`;

  const lines = [
    header,
    ...team.players.map((p) => {
      if (!includeRatings) {
        return `• **${ROLE_LABELS[p.role]}**: ${p.name}`;
      }
      const autofill = p.autofilled ? " — AUTOFILLED" : "";
      return `• **${ROLE_LABELS[p.role]}**: ${p.name} (${p.tier})${autofill}`;
    }),
  ];
  return lines.join("\n");
}

export function formatDraftForDiscord(draft: DraftResult): string {
  const includeRatings = draft.mode !== "normal";
  const header = [`⚔️ **Customs Draft — ${MODE_LABELS[draft.mode]}**`];

  if (draft.mode === "competitive") {
    header.push(
      `Balance: ${draft.balanceScore}% · Diff: ${draft.mmrDifference}`,
      `Favorite: ${draft.favorite === "blue" ? "Blue" : "Red"} Team`
    );
  } else if (draft.mode === "role-consider") {
    header.push(
      `Favorite: ${draft.favorite === "blue" ? "Blue" : "Red"} Team`,
      `Win Chance: Blue ${draft.blueWinChance}% · Red ${draft.redWinChance}%`
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

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
