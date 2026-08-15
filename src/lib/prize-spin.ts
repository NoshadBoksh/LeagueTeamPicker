/** Quiet house edge: these names land about once every 15 spins when on the wheel. */
const RIGGED_PLAYER_IDS = new Set(["gerard", "kieran", "lukas"]);
const RIGGED_ODDS = 1 / 15;

/**
 * Pick a winner index for the prize wheel.
 * Equal odds by default; Gerard, Kieran, and Lukas are each weighted to ~1/15 when present.
 */
export function pickSpinWinnerIndex(playerIds: string[]): number {
  const n = playerIds.length;
  if (n <= 0) return 0;
  if (n === 1) return 0;

  const riggedCount = playerIds.filter((id) => RIGGED_PLAYER_IDS.has(id)).length;
  const otherCount = n - riggedCount;

  // Nobody rigged, or the whole pool is rigged — keep it fair.
  if (riggedCount === 0 || otherCount === 0) {
    return Math.floor(Math.random() * n);
  }

  const remaining = Math.max(0, 1 - riggedCount * RIGGED_ODDS);
  const otherWeight = remaining / otherCount;
  const weights = playerIds.map((id) =>
    RIGGED_PLAYER_IDS.has(id) ? RIGGED_ODDS : otherWeight
  );

  let roll = Math.random();
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return n - 1;
}
