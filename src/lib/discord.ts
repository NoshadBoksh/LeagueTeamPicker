import type { DraftResult, Team } from "@/lib/types";
import { MODE_LABELS, ROLE_LABELS } from "@/lib/types";

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
