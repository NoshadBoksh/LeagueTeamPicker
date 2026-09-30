import {
  avoidPairKey,
  makeAvoidPair,
  type AvoidPairs,
  type RolePrefsOverride,
} from "@/lib/types";

/**
 * House setup: Gerard + Lily bot vs Karthik + Gabriel bot.
 * These four only play ADC/Support, and the duos never share a team.
 */
export const BOT_LANE_ROLE_PREFS: RolePrefsOverride = {
  gerard: { fill: false, roles: ["adc", "support"] },
  lily: { fill: false, roles: ["adc", "support"] },
  karthik: { fill: false, roles: ["adc", "support"] },
  gabriel: { fill: false, roles: ["adc", "support"] },
};

export const BOT_LANE_AVOID_PAIRS: AvoidPairs = [
  makeAvoidPair("gerard", "karthik")!,
  makeAvoidPair("gerard", "gabriel")!,
  makeAvoidPair("lily", "karthik")!,
  makeAvoidPair("lily", "gabriel")!,
];

export function isBotLaneLocked(playerId: string): boolean {
  return Object.prototype.hasOwnProperty.call(BOT_LANE_ROLE_PREFS, playerId);
}

/** Merge bot-lane role locks on top of stored prefs. */
export function withBotLaneRolePrefs(
  prefs?: RolePrefsOverride
): RolePrefsOverride {
  return { ...(prefs ?? {}), ...BOT_LANE_ROLE_PREFS };
}

/** Ensure the duo rivalry avoid-pairs are always present. */
export function withBotLaneAvoidPairs(pairs?: AvoidPairs): AvoidPairs {
  const out = [...(pairs ?? [])];
  for (const pair of BOT_LANE_AVOID_PAIRS) {
    const key = avoidPairKey(pair);
    if (!out.some((p) => avoidPairKey(p) === key)) {
      out.push(pair);
    }
  }
  return out;
}
