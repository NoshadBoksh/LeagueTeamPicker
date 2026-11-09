/**
 * Pick a winner index for the prize wheel.
 * Equal odds for everyone currently on the wheel — no house edge.
 */
export function pickSpinWinnerIndex(playerIds: string[]): number {
  const n = playerIds.length;
  if (n <= 0) return 0;
  return Math.floor(Math.random() * n);
}
