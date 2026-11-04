/** Core card definitions for 6nimmt! (cards numbered 1–104). */

export const MIN_CARD = 1;
export const MAX_CARD = 104;

/** Bullhead (penalty point) values per official rules. */
export function bullheads(n: number): number {
  if (n < MIN_CARD || n > MAX_CARD) {
    throw new RangeError(`card out of range: ${n}`);
  }
  if (n === 55) return 7;
  if (n % 11 === 0) return 5;
  if (n % 10 === 0) return 3;
  if (n % 5 === 0) return 2;
  return 1;
}

/** All 104 cards in ascending order. */
export function fullDeck(): number[] {
  const deck: number[] = [];
  for (let i = MIN_CARD; i <= MAX_CARD; i++) deck.push(i);
  return deck;
}

/** Fisher–Yates shuffle using the supplied RNG (injectable for tests). */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
