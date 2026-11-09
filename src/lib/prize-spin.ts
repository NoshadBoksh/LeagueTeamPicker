/**
 * Quiet spinner weights when present on the wheel:
 * - Laxus ~2/5 (favored)
 * - Gerard ~1/10 (less likely, still can win)
 * Everyone else shares the remaining probability evenly.
 * No one is fully excluded.
 */
const LAXUS_ID = "laxus";
const LAXUS_ODDS = 2 / 5;
const GERARD_ID = "gerard";
const GERARD_ODDS = 1 / 10;

/**
 * Pick a winner index for the prize wheel.
 */
export function pickSpinWinnerIndex(playerIds: string[]): number {
  const n = playerIds.length;
  if (n <= 0) return 0;
  if (n === 1) return 0;

  const weights = buildWeights(playerIds);
  let roll = Math.random();
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return n - 1;
}

function buildWeights(playerIds: string[]): number[] {
  const n = playerIds.length;
  const hasLaxus = playerIds.includes(LAXUS_ID);
  const hasGerard = playerIds.includes(GERARD_ID);

  let reserved = 0;
  if (hasLaxus) reserved += LAXUS_ODDS;
  if (hasGerard) reserved += GERARD_ODDS;

  const otherIndexes: number[] = [];
  for (let i = 0; i < n; i++) {
    const id = playerIds[i];
    if (id === LAXUS_ID || id === GERARD_ID) continue;
    otherIndexes.push(i);
  }

  const weights = new Array(n).fill(0);

  if (otherIndexes.length === 0) {
    // Only weighted players on the wheel — renormalize their odds.
    const total =
      (hasLaxus ? LAXUS_ODDS : 0) + (hasGerard ? GERARD_ODDS : 0);
    for (let i = 0; i < n; i++) {
      if (playerIds[i] === LAXUS_ID) weights[i] = LAXUS_ODDS / total;
      else if (playerIds[i] === GERARD_ID) weights[i] = GERARD_ODDS / total;
    }
    return weights;
  }

  const otherWeight = (1 - reserved) / otherIndexes.length;
  for (let i = 0; i < n; i++) {
    const id = playerIds[i];
    if (id === LAXUS_ID) weights[i] = LAXUS_ODDS;
    else if (id === GERARD_ID) weights[i] = GERARD_ODDS;
    else weights[i] = otherWeight;
  }
  return weights;
}
