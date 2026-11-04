import { describe, expect, it } from 'vitest';
import { bullheads, fullDeck } from '../src/engine/cards';
import {
  HAND_SIZE,
  MATCH_TARGET,
  PLAYER_COUNT,
  ROW_COUNT,
  ROW_MAX,
  cloneMatch,
  consumeCard,
  createMatch,
  findTargetRow,
  isHandOver,
  isMatchOver,
  placeCard,
  resolveOrder,
  startNextHand,
  totalBullheads,
  winners,
} from '../src/engine/rules';

/** Deterministic RNG for reproducible tests (mulberry32). */
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

describe('bullheads distribution', () => {
  it('follows official values', () => {
    expect(bullheads(55)).toBe(7);
    for (const n of [11, 22, 33, 44, 66, 77, 88, 99]) expect(bullheads(n)).toBe(5);
    for (const n of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) expect(bullheads(n)).toBe(3);
    for (const n of [5, 15, 25, 35, 45, 65, 75, 85, 95]) expect(bullheads(n)).toBe(2);
    expect(bullheads(1)).toBe(1);
    expect(bullheads(104)).toBe(1);
    expect(bullheads(7)).toBe(1);
  });

  it('sums to 171 over the whole deck', () => {
    // 1×7 + 8×5 + 10×3 + 9×2 + 76×1 = 7+40+30+18+76 = 171
    expect(totalBullheads(fullDeck())).toBe(171);
  });

  it('has 104 unique cards', () => {
    const deck = fullDeck();
    expect(deck).toHaveLength(104);
    expect(new Set(deck).size).toBe(104);
  });
});

describe('dealing', () => {
  it('deals 10 unique cards to each of 5 players, 4 start rows, no duplicates anywhere', () => {
    const state = createMatch('normal', NAMES, seeded(42));
    const all = [...state.rows.flat(), ...state.players.flatMap((p) => p.hand)];
    expect(state.rows).toHaveLength(ROW_COUNT);
    for (const row of state.rows) expect(row).toHaveLength(1);
    expect(all).toHaveLength(4 + PLAYER_COUNT * HAND_SIZE);
    expect(new Set(all).size).toBe(all.length); // no duplicate cards among players
  });

  it('sorts hands ascending', () => {
    const state = createMatch('normal', NAMES, seeded(7));
    for (const p of state.players) {
      expect([...p.hand].sort((a, b) => a - b)).toEqual(p.hand);
    }
  });
});

describe('findTargetRow', () => {
  it('picks the row with nearest lower end card', () => {
    const rows = [[10], [30], [60], [90]];
    expect(findTargetRow(45, rows)).toBe(1); // 30 is nearest lower to 45
    expect(findTargetRow(31, rows)).toBe(1);
    expect(findTargetRow(30, rows)).toBe(0); // must be strictly lower
    expect(findTargetRow(100, rows)).toBe(3);
    expect(findTargetRow(5, rows)).toBeNull(); // lower than all ends → must choose
  });

  it('uses the last card as the end even in multi-card rows', () => {
    const rows = [[10, 20, 25], [30], [60], [90]];
    expect(findTargetRow(27, rows)).toBe(0); // 25 is nearest lower
    expect(findTargetRow(30, rows)).toBe(0); // must be strictly lower than end
    expect(findTargetRow(31, rows)).toBe(1); // 30 now nearest lower
  });
});

describe('placeCard', () => {
  function setup() {
    return createMatch('normal', NAMES, seeded(99));
  }

  it('appends to the target row when under the limit', () => {
    const s = setup();
    s.rows = [[10], [30], [60], [90]];
    const events = placeCard(s, 1, 45);
    expect(s.rows[1]).toEqual([30, 45]);
    expect(events.some((e) => e.type === 'cardPlaced')).toBe(true);
  });

  it('6th card: player takes the 5, played card stays as new row start', () => {
    const s = setup();
    s.rows = [[10, 12, 14, 16, 18], [30], [60], [90]];
    const before = s.players[2].score;
    const events = placeCard(s, 2, 20);
    const take = events.find((e) => e.type === 'rowTaken');
    expect(take).toBeDefined();
    expect(s.rows[0]).toEqual([20]);
    expect(s.players[2].score - before).toBe(totalBullheads([10, 12, 14, 16, 18]));
    expect(s.players[2].handScore).toBe(s.players[2].score - before);
  });

  it('low card: must choose a row, and refusing throws', () => {
    const s = setup();
    s.rows = [[10], [30], [60], [90]];
    expect(() => placeCard(s, 3, 5)).toThrow();
    const events = placeCard(s, 3, 5, 2);
    expect(events.some((e) => e.type === 'rowChosen')).toBe(true);
    expect(s.rows[2]).toEqual([60, 5]); // 5 appended if row not full
  });

  it('low card onto a full row takes it, played card starts the row', () => {
    const s = setup();
    s.rows = [[10], [30, 32, 34, 36, 38], [60], [90]];
    placeCard(s, 3, 5, 1);
    expect(s.rows[1]).toEqual([5]);
    expect(s.players[3].score).toBe(totalBullheads([30, 32, 34, 36, 38]));
  });

  it('rejects a card the player does not hold', () => {
    const s = setup();
    expect(() => consumeCard(s, 0, 104)).toThrow();
  });
});

describe('resolveOrder', () => {
  it('sorts plays ascending (cards unique → no ties)', () => {
    const plays = [
      { player: 0, card: 55 },
      { player: 2, card: 3 },
      { player: 1, card: 90 },
      { player: 3, card: 30 },
      { player: 4, card: 7 },
    ];
    expect(resolveOrder(plays).map((p) => p.card)).toEqual([3, 7, 30, 55, 90]);
  });
});

describe('match flow', () => {
  it('plays a full hand without duplicate cards ever appearing', () => {
    const s = createMatch('normal', NAMES, seeded(1234));
    let takenToPiles = 0;
    for (let round = 0; round < HAND_SIZE; round++) {
      const plays = s.players.map((p) => {
        const card = p.hand[0];
        consumeCard(s, p.id, card);
        return { player: p.id, card };
      });
      for (const { player, card } of resolveOrder(plays)) {
        const target = findTargetRow(card, s.rows);
        // must-choose: take the row with the fewest bullheads (legal in all cases)
        const chosen =
          target ??
          s.rows
            .map((r, i) => ({ i, pts: totalBullheads(r) }))
            .sort((a, b) => a.pts - b.pts)[0].i;
        const events = placeCard(s, player, card, chosen);
        const take = events.find((e) => e.type === 'rowTaken');
        if (take && take.type === 'rowTaken') takenToPiles += take.taken.length;
      }
      // everything ever dealt is either in a hand, on a row, or in a scoring pile
      const live = [...s.rows.flat(), ...s.players.flatMap((p) => p.hand)];
      expect(new Set(live).size).toBe(live.length);
      expect(live.length + takenToPiles).toBe(4 + PLAYER_COUNT * HAND_SIZE);
      expect(s.players.map((p) => p.hand.length)).toEqual(
        Array(PLAYER_COUNT).fill(HAND_SIZE - round - 1),
      );
    }
    expect(isHandOver(s)).toBe(true);
  });

  it('end hand: score persists into next hand, handScore resets', () => {
    const s = createMatch('normal', NAMES, seeded(5));
    s.players[1].score = 40;
    s.players[1].handScore = 40;
    startNextHand(s, seeded(6));
    expect(s.players[1].score).toBe(40);
    expect(s.players[1].handScore).toBe(0);
    expect(s.handsPlayed).toBe(1);
    expect(isHandOver(s)).toBe(false);
    for (const p of s.players) expect(p.hand).toHaveLength(HAND_SIZE);
  });

  it('match over requires ≥66 after a completed hand', () => {
    const s = createMatch('normal', NAMES, seeded(5));
    s.players[4].score = 70;
    expect(isMatchOver(s)).toBe(false); // hand not finished
    for (const p of s.players) p.hand = [];
    expect(isMatchOver(s)).toBe(true);
  });

  it('fewest points wins; exact bottom tie = shared victory', () => {
    const s = createMatch('normal', NAMES, seeded(5));
    for (const p of s.players) p.hand = [];
    s.players[0].score = 12;
    s.players[1].score = 30;
    s.players[2].score = 12;
    s.players[3].score = 66;
    s.players[4].score = 80;
    expect(winners(s)).toEqual([0, 2]);
  });

  it('cloneMatch is deep (simulation safety)', () => {
    const s = createMatch('normal', NAMES, seeded(9));
    const c = cloneMatch(s);
    const card = s.players[0].hand[0];
    consumeCard(s, 0, card);
    s.rows[0].push(999);
    expect(c.players[0].hand).toHaveLength(HAND_SIZE);
    expect(c.players[0].hand).toContain(card);
    expect(c.rows[0]).toHaveLength(1);
    expect(c.rows[0]).not.toContain(999);
  });
});

describe('match target', () => {
  it('exposes 66 as the match target', () => {
    expect(MATCH_TARGET).toBe(66);
    expect(ROW_MAX).toBe(5);
    expect(ROW_COUNT).toBe(4);
  });
});
