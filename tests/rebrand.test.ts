import { describe, expect, it, vi } from 'vitest';
import {
  BOT_COMPOSITION,
  createMatch,
  MATCH_TARGET,
} from '../src/engine/rules';
import { ROSTER, sampleRoster } from '../src/engine/roster';

const NAMES = ['YOU', 'A', 'B', 'C', 'D'];

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

describe('mixed bot composition', () => {
  it('deals exactly 1x normal, 1x hard, 1x asian, 1x random across the four bots', () => {
    expect([...BOT_COMPOSITION].sort()).toEqual(['asian', 'hard', 'normal', 'random']);
    for (let seed = 1; seed <= 40; seed++) {
      const m = createMatch(NAMES, seeded(seed));
      expect(m.players[0].tier).toBeNull(); // human seat
      const tiers = m.players.slice(1).map((p) => p.tier).sort();
      expect(tiers).toEqual(['asian', 'hard', 'normal', 'random']);
    }
  });

  it('shuffles seat assignment between matches', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const m = createMatch(NAMES, seeded(seed));
      seen.add(m.players.slice(1).map((p) => p.tier).join(','));
    }
    expect(seen.size).toBeGreaterThan(1); // not a fixed seat order
  });

  it('accepts pinned tiers (tests)', () => {
    const m = createMatch(NAMES, seeded(1), ['hard', 'hard', 'hard', 'hard']);
    expect(m.players.slice(1).map((p) => p.tier)).toEqual(['hard', 'hard', 'hard', 'hard']);
  });
});

describe('callsign roster', () => {
  it('holds 30 unique names', () => {
    expect(ROSTER).toHaveLength(30);
    expect(new Set(ROSTER).size).toBe(30);
  });

  it('samples 4 distinct roster names per match', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const picked = sampleRoster(seeded(seed));
      expect(picked).toHaveLength(4);
      expect(new Set(picked).size).toBe(4);
      for (const name of picked) expect(ROSTER).toContain(name);
    }
  });

  it('the whole roster appears over many samples (no dead names)', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 400; seed++) sampleRoster(seeded(seed)).forEach((n) => seen.add(n));
    expect(seen.size).toBe(30);
  });
});

describe('rebrand migration', () => {
  it('moves bullheads.* keys to hyperstrike.* and backfills tiers', async () => {
    vi.resetModules();
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };

    // legacy pre-rebrand saves: old keys, match-wide difficulty, no tiers
    store.set('bullheads.settings.v1', '{"language":"en","speed":2}');
    const legacyMatch = {
      version: 1,
      savedAt: Date.now(),
      state: {
        players: Array.from({ length: 5 }, (_, i) => ({
          id: i,
          name: i === 0 ? 'YOU' : `P${i}`,
          hand: [],
          score: i * 10,
          handScore: 0,
          takenCards: [],
        })),
        rows: [[10], [30], [50], [70]],
        round: 3,
        handsPlayed: 1,
        difficulty: 'hard',
        humanId: 0,
        seq: 42,
      },
    };
    store.set('bullheads.match.v1', JSON.stringify(legacyMatch));

    const mod = await import('../src/state/persistence');

    // keys migrated, old ones gone
    expect(store.has('bullheads.settings.v1')).toBe(false);
    expect(store.has('bullheads.match.v1')).toBe(false);
    expect(store.get('hyperstrike.settings.v1')).toBe('{"language":"en","speed":2}');

    // settings load from the new key
    expect(mod.loadSettings().speed).toBe(2);

    // match loads with tiers backfilled from the old match-wide difficulty
    const loaded = mod.loadMatch();
    expect(loaded).not.toBeNull();
    expect(loaded!.state.round).toBe(3);
    expect(loaded!.state.players[0].tier).toBeNull();
    for (const p of loaded!.state.players.slice(1)) expect(p.tier).toBe('hard');
    expect((loaded!.state as { difficulty?: string }).difficulty).toBeUndefined();

    vi.resetModules();
  });

  it('match target is 100 damage', () => {
    expect(MATCH_TARGET).toBe(100);
  });
});
