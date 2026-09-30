/** Quiet house edge: Gerard lands about once every 10 spins when he's on the wheel. */
const RIGGED_PLAYER_ID = "gerard";
const RIGGED_ODDS = 1 / 10;

/** Never award a prize point to these players — they stay off the winner pool. */
const EXCLUDED_FROM_SPIN = new Set(["lily"]);

/**
 * Pick a winner index for the prize wheel.
 * Lily is never chosen. Gerard is weighted to ~1/10 when present among the rest.
 */
export function pickSpinWinnerIndex(playerIds: string[]): number {
  const n = playerIds.length;
  if (n <= 0) return 0;
  if (n === 1) return 0;

  const eligible = playerIds
    .map((id, index) => ({ id, index }))
    .filter(({ id }) => !EXCLUDED_FROM_SPIN.has(id));

  if (eligible.length === 0) {
    return Math.floor(Math.random() * n);
  }

  if (eligible.length === 1) {
    return eligible[0].index;
  }

  const eligibleIds = eligible.map((e) => e.id);
  const local = pickWeightedAmongEligible(eligibleIds);
  return eligible[local].index;
}

function pickWeightedAmongEligible(playerIds: string[]): number {
  const n = playerIds.length;
  const riggedIndex = playerIds.indexOf(RIGGED_PLAYER_ID);
  if (riggedIndex === -1) {
    return Math.floor(Math.random() * n);
  }

  const otherCount = n - 1;
  const otherWeight = (1 - RIGGED_ODDS) / otherCount;
  const weights = playerIds.map((id) =>
    id === RIGGED_PLAYER_ID ? RIGGED_ODDS : otherWeight
  );

  let roll = Math.random();
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return n - 1;
}
