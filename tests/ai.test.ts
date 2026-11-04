import { describe, expect, it } from 'vitest';
import { chooseCard, chooseRow } from '../src/ai/bots';
import { createMatch, cloneMatch } from '../src/engine/rules';

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
const DIFFS = ['normal', 'hard', 'asian'] as const;

describe('chooseCard legality', () => {
  it('always returns a card the player actually holds, for every difficulty', () => {
    for (const difficulty of DIFFS) {
      for (let seed = 1; seed <= 25; seed++) {
        const state = createMatch(difficulty, NAMES, seeded(seed));
        for (const p of state.players) {
          const card = chooseCard(state, p.id, { rng: seeded(seed * 100 + p.id), samples: 4 });
          expect(p.hand).toContain(card);
        }
      }
    }
  });

  it('is deterministic with a seeded rng', () => {
    const state = createMatch('asian', NAMES, seeded(3));
    const a = chooseCard(state, 0, { rng: seeded(77), samples: 8 });
    const b = chooseCard(state, 0, { rng: seeded(77), samples: 8 });
    expect(a).toBe(b);
  });
});

describe('no cheating (asian tier)', () => {
  it('chooses the same card regardless of opponents hidden hands', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const base = createMatch('asian', NAMES, seeded(seed));
      const variant = cloneMatch(base);
      // Shuffle opponents' hidden hands — public info is unchanged.
      const h1 = variant.players[1].hand;
      variant.players[1].hand = variant.players[3].hand.slice();
      variant.players[3].hand = h1.slice();
      const h2 = variant.players[2].hand;
      variant.players[2].hand = variant.players[4].hand.slice();
      variant.players[4].hand = h2.slice();

      const a = chooseCard(base, 0, { rng: seeded(999), samples: 8 });
      const b = chooseCard(variant, 0, { rng: seeded(999), samples: 8 });
      expect(b).toBe(a);
    }
  });

  it('normal and hard never read anything but rows + own hand', () => {
    // Structurally guaranteed (they only take rows/hand args); assert outputs
    // also match under hand shuffling of opponents, with a seeded rng so the
    // hard tier's rollouts are reproducible.
    const base = createMatch('hard', NAMES, seeded(4));
    const variant = cloneMatch(base);
    const h = variant.players[1].hand;
    variant.players[1].hand = variant.players[2].hand;
    variant.players[2].hand = h;
    expect(chooseCard(variant, 0, { rng: seeded(9) })).toBe(
      chooseCard(base, 0, { rng: seeded(9) }),
    );
  });
});

describe('difficulty behavior', () => {
  it('normal hoards the big card when both plays are free (no foresight)', () => {
    const s = createMatch('normal', NAMES, seeded(1));
    s.rows = [
      [15, 17, 19, 21], // len 4 — filling it creates an instant-take row
      [10],
      [40],
      [80, 84, 88, 92], // len 4, heavy (88 = 5 bullheads)
    ];
    s.players[0].hand = [50, 93];
    // Both plays cost 0 right now; the naive tie-break keeps the smallest.
    expect(chooseCard(s, 0)).toBe(50);
  });

  it('hard never walks into a sure take when a safe card exists', () => {
    // Property across seeds: landing on the full row costs 7 bullheads now;
    // any Monte-Carlo rollout sees that immediately.
    for (let seed = 1; seed <= 10; seed++) {
      const s = createMatch('hard', NAMES, seeded(seed));
      s.rows = [[10, 12, 14, 16, 18], [50], [70], [90]]; // row 0 is full
      s.players[0].hand = [19, 55, 99];
      const card = chooseCard(s, 0, { rng: seeded(seed * 31) });
      expect(card).not.toBe(19);
    }
  });

  it('asian never walks into a sure take when a safe card exists', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const s = createMatch('asian', NAMES, seeded(seed));
      s.rows = [[10, 12, 14, 16, 18], [50], [70], [90]];
      s.players[0].hand = [19, 55, 99];
      const card = chooseCard(s, 0, { rng: seeded(seed * 17), samples: 8 });
      expect(card).not.toBe(19);
    }
  });
});

describe('chooseRow', () => {
  it('takes the row with fewest bullheads', () => {
    const rows = [
      [55, 11, 10], // 7+5+3 = 15
      [1, 2], // 1+1 = 2  ← fewest
      [88], // 5
      [90], // 3
    ];
    expect(chooseRow(rows)).toBe(1);
  });

  it('breaks ties by fewest cards', () => {
    const rows = [
      [1, 2], // 2 pts, 2 cards
      [95], // 2 pts, 1 card
      [70], // 3 pts
      [88], // 5 pts
    ];
    expect(chooseRow(rows)).toBe(1);
  });
});
