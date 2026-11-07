import { describe, expect, it } from 'vitest';
import { chooseCard, chooseRow } from '../src/ai/bots';
import {
  type Difficulty,
  type MatchState,
  createMatch,
  findTargetRow,
  isHandOver,
  isMatchOver,
  placeCard,
  consumeCard,
  resolveOrder,
  startNextHand,
} from '../src/engine/rules';

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = ['You', 'Nyx', 'Flux', 'Rook', 'Kira'];

type Policy = (state: MatchState, playerId: number, rng: () => number) => number;

/** Fixed measuring stick: the strong dump-high greedy policy. */
const reference: Policy = (state, playerId, rng) =>
  chooseCard(state, playerId, { policy: 'greedy-dump', rng });

const tierPolicy =
  (difficulty: Difficulty): Policy =>
  (state, playerId, rng) =>
    chooseCard(state, playerId, { rng, difficultyOverride: difficulty });

/** Play one hand to completion with every seat run by `policy`. */
function playHandToEnd(state: MatchState, rng: () => number, policy: Policy): void {
  while (!isHandOver(state)) {
    const plays = state.players.map((p) => ({
      player: p.id,
      card: policy(state, p.id, rng),
    }));
    for (const { player, card } of resolveOrder(plays)) {
      consumeCard(state, player, card);
      const row = findTargetRow(card, state.rows);
      placeCard(state, player, card, row ?? chooseRow(state.rows));
    }
  }
}

function playPoolMatch(difficulty: Difficulty, seed: number) {
  const rng = seeded(seed);
  const state = createMatch(NAMES, rng, [difficulty, difficulty, difficulty, difficulty]);
  let hands = 0;
  for (;;) {
    playHandToEnd(state, rng, tierPolicy(difficulty));
    if (isMatchOver(state)) break;
    if (++hands > 200) throw new Error('match failed to terminate');
    startNextHand(state, rng);
  }
  return { state, hands: hands + 1 };
}

describe('simulation: termination', () => {
  it('every match finishes well under the hand cap (all difficulties)', () => {
    for (const difficulty of ['normal', 'hard', 'asian'] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const { state, hands } = playPoolMatch(difficulty, seed);
        expect(hands).toBeLessThan(60);
        expect(state.players.some((p) => p.score >= 66)).toBe(true);
      }
    }
  }, 600_000);
});

/**
 * Tier ordering via hero-vs-reference: seat0 plays the tier under test while
 * four fixed dump-high greedy bots hold the environment constant. Deal rng is
 * separate from AI rng so every tier sees identical deals (paired comparison).
 * Lower average score = stronger tier.
 */
function avgHeroScore(difficulty: Difficulty, seeds: number[]): number {
  let total = 0;
  for (const seed of seeds) {
    const dealRng = seeded(seed);
    const aiRng = seeded(seed ^ 0x9e3779b9);
    const state = createMatch(NAMES, dealRng);
    const hero = tierPolicy(difficulty);
    let hands = 0;
    for (;;) {
      playHandToEnd(state, aiRng, (s, id, rng) =>
        id === 0 ? hero(s, id, rng) : reference(s, id, rng),
      );
      if (isMatchOver(state)) break;
      if (++hands > 200) throw new Error('match failed to terminate');
      startNextHand(state, dealRng);
    }
    total += state.players[0].score;
  }
  return total / seeds.length;
}

describe('simulation: difficulty ordering', () => {
  it('asian outperforms hard, which outperforms normal (vs fixed reference)', () => {
    const seeds = Array.from({ length: 120 }, (_, i) => 500 + i);
    const avg = {
      normal: avgHeroScore('normal', seeds),
      hard: avgHeroScore('hard', seeds),
      asian: avgHeroScore('asian', seeds),
    };
    // eslint-disable-next-line no-console
    console.log('avg hero score vs reference bots:', avg);
    expect(avg.asian).toBeLessThan(avg.hard);
    expect(avg.hard).toBeLessThan(avg.normal);
  }, 600_000);
});
