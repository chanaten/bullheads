/**
 * Pure rules engine for the game.
 *
 * Official base rules (Amigo):
 *  - 4 rows, each starting with one card; max 5 cards per row.
 *  - A card must go on the row whose end card is the nearest LOWER value.
 *  - If that row already has 5 cards, the player takes the 5 and the played
 *    card stays as the first card of the (new) row.
 *  - If the card is lower than every row's end card, the player chooses
 *    which row to take (usually fewest damage); their card starts that row.
 *  - Cards are unique across all players — asserted, never violated.
 *
 * This module is renderer-free and deterministic given an RNG.
 */

import { damage, fullDeck, shuffle } from './cards';

export const PLAYER_COUNT = 5;
export const HAND_SIZE = 10;
export const ROW_COUNT = 4;
export const ROW_MAX = 5; // cards per row before a take happens
/** First pilot whose damage reaches this loses (HP starts at 100). */
export const MATCH_TARGET = 100;

export type Difficulty = 'normal' | 'hard' | 'asian';
/** Per-bot algorithm tier (the match always mixes all four). */
export type BotTier = Difficulty | 'random';

/** The fixed skill spread dealt to the four bot seats each match. */
export const BOT_COMPOSITION: readonly BotTier[] = ['normal', 'hard', 'asian', 'random'];

export interface PlayerState {
  readonly id: number;
  name: string;
  hand: number[];
  /** Penalty points taken so far this match. */
  score: number;
  /** Damage taken this hand (resets each hand). */
  handScore: number;
  /** Cards gathered this hand (public info — resets each hand; not shown in UI). */
  takenCards: number[];
  /** Bot algorithm (null for the human seat). */
  tier: BotTier | null;
}

export interface MatchState {
  players: PlayerState[];
  /** rows[0..3], each row is a stack of cards (end = last element). */
  rows: number[][];
  /** 0-based round index within the hand (0..9). */
  round: number;
  /** Hands played so far (completed). */
  handsPlayed: number;
  /** Index of the player who is "you" (the human seat). */
  humanId: number;
  /** Monotonic event counter for renderer sync. */
  seq: number;
}

/** Events emitted by rule operations; consumed by the state machine/renderer. */
export type EngineEvent =
  | { type: 'cardPlaced'; player: number; card: number; row: number }
  | {
      type: 'rowTaken';
      player: number;
      /** The 5 (or fewer, on the first take of a hand) cards gathered. */
      taken: number[];
      damage: number;
      /** Row index after placement (the played card starts it). */
      row: number;
      played: number;
      /** true when triggered because the row was full (6th card). */
      overflow: boolean;
    }
  | { type: 'rowChosen'; player: number; card: number; row: number };

export interface PlacementPlan {
  row: number;
  /** true when the player must choose a row (card lower than all ends). */
  mustChoose: boolean;
}

export interface RowApplication {
  row: number;
  /** The gathered cards when a take happened, else null. */
  took: number[] | null;
  overflow: boolean;
  /** true when the card was lower than all row ends (row was chosen). */
  forced: boolean;
}

/**
 * Apply `card` to `rows`, mutating them. `chosenRow` is only read when the
 * card is lower than every row's end. Shared by the match engine and the AI.
 *
 * Two ways a play takes cards:
 *  - the card would be the 6th on its target row → gather the 5, card stays;
 *  - the card is lower than every row end (forced choice) → gather the WHOLE
 *    chosen row (any length), card stays as its new first card.
 */
export function applyToRows(
  rows: number[][],
  card: number,
  chosenRow: number | null = null,
): RowApplication {
  const target = findTargetRow(card, rows);
  let row: number;
  let forced = false;
  if (target === null) {
    if (chosenRow === null || chosenRow < 0 || chosenRow >= rows.length) {
      throw new Error(`card ${card} is lower than all rows; a row must be chosen`);
    }
    row = chosenRow;
    forced = true;
  } else {
    row = target;
  }
  const rowCards = rows[row];
  if (forced || rowCards.length >= ROW_MAX) {
    // gather the row; the played card stays behind as its new first card
    const took = rowCards.slice();
    rows[row] = [card];
    return { row, took, overflow: !forced, forced };
  }
  rowCards.push(card);
  return { row, took: null, overflow: false, forced };
}

/** Create the four starting rows from a shuffled deck:4 cards, one per row. */
function deal(dealerRng: () => number = Math.random): { rows: number[][]; hands: number[][] } {
  const deck = shuffle(fullDeck(), dealerRng);
  const rows = deck.slice(0, ROW_COUNT).map((c) => [c]);
  const hands: number[][] = Array.from({ length: PLAYER_COUNT }, () => []);
  // Deal HAND_SIZE cards to each player; the remainder (54) is unused this hand.
  for (let i = ROW_COUNT; i < ROW_COUNT + PLAYER_COUNT * HAND_SIZE; i++) {
    hands[(i - ROW_COUNT) % PLAYER_COUNT].push(deck[i]);
  }
  for (const h of hands) h.sort((a, b) => a - b);
  return { rows, hands };
}

/**
 * Create a match. Names cover all five seats; bot tiers default to the fixed
 * 1x normal / 1x hard / 1x asian / 1x random composition, shuffled across
 * seats 1-4 (seat 0 is the human). Tests may pin explicit tiers.
 */
export function createMatch(
  playerNames: readonly string[],
  rng: () => number = Math.random,
  botTiers?: readonly BotTier[],
): MatchState {
  if (playerNames.length !== PLAYER_COUNT) {
    throw new Error(`expected ${PLAYER_COUNT} player names`);
  }
  const { rows, hands } = deal(rng);
  const tiers = botTiers ? [...botTiers] : shuffle([...BOT_COMPOSITION], rng);
  if (tiers.length !== PLAYER_COUNT - 1) {
    throw new Error(`expected ${PLAYER_COUNT - 1} bot tiers`);
  }
  const players: PlayerState[] = playerNames.map((name, id) => ({
    id,
    name,
    hand: hands[id],
    score: 0,
    handScore: 0,
    takenCards: [],
    tier: id === 0 ? null : tiers[id - 1],
  }));
  return {
    players,
    rows,
    round: 0,
    handsPlayed: 0,
    humanId: 0,
    seq: 0,
  };
}

/**
 * Where does `card` go on `rows`? Returns the target row index, or null when
 * the card is lower than every row's end (the player must choose a row).
 */
export function findTargetRow(card: number, rows: readonly number[][]): number | null {
  let best = -1;
  let bestEnd = -Infinity;
  for (let i = 0; i < rows.length; i++) {
    const end = rows[i][rows[i].length - 1];
    if (end < card && end > bestEnd) {
      bestEnd = end;
      best = i;
    }
  }
  return best === -1 ? null : best;
}

/** Damage total of a set of cards. */
export function totalDamage(cards: readonly number[]): number {
  return cards.reduce((sum, c) => sum + damage(c), 0);
}

/**
 * Place `card` for `player` onto `rows`, mutating rows and returning events.
 * `chosenRow` is only read when findTargetRow returned null.
 * Throws if placement is illegal (guards the renderer against desync).
 */
export function placeCard(
  state: MatchState,
  player: number,
  card: number,
  chosenRow: number | null = null,
): EngineEvent[] {
  const events: EngineEvent[] = [];
  const app = applyToRows(state.rows, card, chosenRow);

  if (app.forced) {
    events.push({ type: 'rowChosen', player, card, row: app.row });
  }
  if (app.took) {
    const pts = totalDamage(app.took);
    state.players[player].score += pts;
    state.players[player].handScore += pts;
    state.players[player].takenCards.push(...app.took);
    events.push({
      type: 'rowTaken',
      player,
      taken: app.took,
      damage: pts,
      row: app.row,
      played: card,
      overflow: app.overflow,
    });
  }
  events.push({ type: 'cardPlaced', player, card, row: app.row });
  state.seq++;
  return events;
}

/** Is `card` legal to play from this player's hand? (Always true in base rules.) */
export function isLegalPlay(state: MatchState, player: number, card: number): boolean {
  return state.players[player].hand.includes(card);
}

/**
 * The five played cards resolved in official order: ascending value.
 * Cards are unique so no tie-breaking is ever needed.
 */
export function resolveOrder(plays: readonly { player: number; card: number }[]): { player: number; card: number }[] {
  return plays.slice().sort((a, b) => a.card - b.card);
}

/** Hand is over when all players are out of cards. */
export function isHandOver(state: MatchState): boolean {
  return state.players.every((p) => p.hand.length === 0);
}

/** Match is over when anyone has reached the target after a completed hand. */
export function isMatchOver(state: MatchState): boolean {
  return isHandOver(state) && state.players.some((p) => p.score >= MATCH_TARGET);
}

/**
 * Winners = fewest total damage; exact tie at the bottom = shared victory.
 * Only valid once the match is over.
 */
export function winners(state: MatchState): number[] {
  const min = Math.min(...state.players.map((p) => p.score));
  return state.players.filter((p) => p.score === min).map((p) => p.id);
}

/** Prepare a fresh hand on an existing match (scores persist). */
export function startNextHand(state: MatchState, rng: () => number = Math.random): void {
  const { rows, hands } = deal(rng);
  state.rows = rows;
  state.round = 0;
  state.handsPlayed++;
  for (let i = 0; i < state.players.length; i++) {
    state.players[i].hand = hands[i];
    state.players[i].handScore = 0;
    state.players[i].takenCards = [];
  }
  state.seq++;
}

/** Deep-copy a match (for AI simulation). */
export function cloneMatch(state: MatchState): MatchState {
  return {
    ...state,
    rows: state.rows.map((r) => r.slice()),
    players: state.players.map((p) => ({
      ...p,
      hand: p.hand.slice(),
      takenCards: p.takenCards.slice(),
    })),
  };
}

/** Remove a played card from a player's hand. */
export function consumeCard(state: MatchState, player: number, card: number): void {
  const hand = state.players[player].hand;
  const idx = hand.indexOf(card);
  if (idx === -1) throw new Error(`player ${player} does not hold card ${card}`);
  hand.splice(idx, 1);
}
