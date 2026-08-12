/** Quiet house edge: Gerard lands about once every 15 spins when he's in the pool. */
const RIGGED_PLAYER_ID = "gerard";
const RIGGED_ODDS = 1 / 15;

/**
 * Pick a winner index for the prize wheel.
 * Equal odds for everyone, except Gerard is weighted to ~1/15 when present.
 */
export function pickSpinWinnerIndex(playerIds: string[]): number {
  const n = playerIds.length;
  if (n <= 0) return 0;
  if (n === 1) return 0;

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
