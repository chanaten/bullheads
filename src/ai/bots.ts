/**
 * Local heuristic opponents — no AI services, no cost, no hand peeking.
 *
 * Difficulty tiers are a pure difference in search depth (verified by
 * bot-vs-bot simulation — see tests/simulation.test.ts):
 *  - normal: greedy on immediate cost only, no foresight (naive tie-break
 *            that hoards big cards).
 *  - hard:   Monte-Carlo, 12 rollouts — simulates each card's landing and
 *            the rest of the hand from there.
 *  - asian:  Monte-Carlo, 24 rollouts — deeper search with card counting
 *            (opponents' hands drawn from the honest posterior, never read).
 */

import { fullDeck, shuffle } from '../engine/cards';
import {
  type Difficulty,
  type MatchState,
  applyToRows,
  cloneMatch,
  consumeCard,
  findTargetRow,
  isHandOver,
  resolveOrder,
  totalBullheads,
} from '../engine/rules';

/** The row a forced player should take: fewest bullheads, then fewest cards. */
export function chooseRow(rows: readonly number[][]): number {
  let best = 0;
  let bestPts = Infinity;
  let bestLen = Infinity;
  for (let i = 0; i < rows.length; i++) {
    const pts = totalBullheads(rows[i]);
    const len = rows[i].length;
    if (pts < bestPts || (pts === bestPts && len < bestLen)) {
      best = i;
      bestPts = pts;
      bestLen = len;
    }
  }
  return best;
}

/** Immediate-cost placement preview without touching the real state. */
function immediateCost(rows: readonly number[][], card: number): number {
  const copy = rows.map((r) => r.slice());
  const res = applyToRows(copy, card, chooseRow(copy));
  return res.took ? totalBullheads(res.took) : 0;
}

/**
 * Greedy pick: minimize the bullheads this play costs right now.
 * Tie-break `dumpHigh` (strong): play the LARGEST card — sheds dangerous high
 * cards while rows are still low. Weak tiers keep the smallest instead.
 */
function greedyPick(
  hand: readonly number[],
  rows: readonly number[][],
  dumpHigh: boolean,
): number {
  let best = hand[0];
  let bestCost = Infinity;
  for (const card of hand) {
    const cost = immediateCost(rows, card);
    const better =
      cost < bestCost - 1e-9 ||
      (Math.abs(cost - bestCost) < 1e-9 && (dumpHigh ? card > best : card < best));
    if (better) {
      bestCost = cost;
      best = card;
    }
  }
  return best;
}

/**
 * Cards whose location is public to `playerId`: rows, this hand's gathered
 * piles, and their own hand. Everything else (opponents' hands + stock) is
 * the honest unknown pool — sampled, never peeked.
 */
function unseenCards(state: MatchState, playerId: number): number[] {
  const seen = new Set<number>();
  for (const r of state.rows) for (const c of r) seen.add(c);
  for (const p of state.players) for (const c of p.takenCards) seen.add(c);
  for (const c of state.players[playerId].hand) seen.add(c);
  return fullDeck().filter((c) => !seen.has(c));
}

/**
 * Draw one hypothetical set of opponents' hands from the honest prior
 * (matching each opponent's current hand size). The real hands are never
 * read — this is the Bayesian posterior given public information only.
 */
export function sampleOpponentHands(
  state: MatchState,
  playerId: number,
  rng: () => number,
): number[][] {
  const pool = shuffle(unseenCards(state, playerId), rng);
  const opponents = state.players.filter((p) => p.id !== playerId);
  let idx = 0;
  return opponents.map((p) => {
    const n = p.hand.length;
    const hand = pool.slice(idx, idx + n).sort((a, b) => a - b);
    idx += n;
    return hand;
  });
}

/**
 * Play out the rest of the hand: `firstCard` is committed for `playerId` in
 * round 1; everyone else (and playerId thereafter) plays the strong greedy
 * policy from `oppHands`. Returns the bullheads playerId pays from here.
 */
export function playoutHandCost(
  state: MatchState,
  playerId: number,
  firstCard: number,
  oppHands: readonly number[][],
  selfDumpHigh = true,
): number {
  const s = cloneMatch(state);
  const opponents = s.players.filter((p) => p.id !== playerId);
  opponents.forEach((p, i) => {
    p.hand = oppHands[i].slice();
  });

  let pendingFirst: number | null = firstCard;

  const place = (player: number, card: number): void => {
    consumeCard(s, player, card);
    const row = findTargetRow(card, s.rows);
    const res = applyToRows(s.rows, card, row ?? chooseRow(s.rows));
    if (res.took && player === playerId) {
      s.players[playerId].score += totalBullheads(res.took);
    }
  };

  while (!isHandOver(s) && s.players[playerId].hand.length > 0) {
    const plays = s.players.map((p) => {
      if (p.id === playerId) {
        // The decision under evaluation is played exactly once, in round 1.
        return { player: p.id, card: pendingFirst ?? greedyPick(p.hand, s.rows, selfDumpHigh) };
      }
      return { player: p.id, card: greedyPick(p.hand, s.rows, true) };
    });
    pendingFirst = null;
    for (const { player, card } of resolveOrder(plays)) place(player, card);
  }
  return s.players[playerId].score - state.players[playerId].score;
}

export interface ChooseOptions {
  /** Monte-Carlo rollouts per decision (hard/asian tiers). */
  samples?: number;
  rng?: () => number;
  /** Explicit policy override (experiments/tests). */
  policy?: 'greedy-dump' | 'greedy-keep';
  /** Play as this tier regardless of the match difficulty (tests). */
  difficultyOverride?: Difficulty;
}

/** Pick a card for `playerId` according to the match's difficulty. */
export function chooseCard(state: MatchState, playerId: number, opts: ChooseOptions = {}): number {
  const hand = state.players[playerId].hand;
  if (hand.length === 0) throw new Error('player has no cards');
  if (hand.length === 1) return hand[0];
  const rng = opts.rng ?? Math.random;
  const difficulty = opts.difficultyOverride ?? state.difficulty;

  if (opts.policy === 'greedy-dump') return greedyPick(hand, state.rows, true);
  if (opts.policy === 'greedy-keep') return greedyPick(hand, state.rows, false);
  if (difficulty === 'normal') return greedyPick(hand, state.rows, false);

  // hard & asian: Monte-Carlo with common random numbers — candidate
  // differences are judged against identical rollouts (signal, not noise).
  const samples = opts.samples ?? (difficulty === 'hard' ? 12 : 24);
  const contexts = Array.from({ length: samples }, () =>
    sampleOpponentHands(state, playerId, rng),
  );
  let best = hand[0];
  let bestCost = Infinity;
  for (const card of hand) {
    let total = 0;
    for (const ctx of contexts) total += playoutHandCost(state, playerId, card, ctx);
    const cost = total / samples;
    if (cost < bestCost - 1e-9 || (Math.abs(cost - bestCost) < 1e-9 && card > best)) {
      bestCost = cost;
      best = card;
    }
  }
  return best;
}
