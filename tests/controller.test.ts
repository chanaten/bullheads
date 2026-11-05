import { describe, expect, it } from 'vitest';
import { MatchController, type UIHooks } from '../src/state/controller';
import { chooseCard } from '../src/ai/bots';
import { type EngineEvent, createMatch, isMatchOver, totalBullheads } from './helpers';
import { clearMatch, loadMatch } from '../src/state/persistence';

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

interface Log {
  events: string[];
  asks: number;
  scoreboards: number;
  matchEnds: number[];
}

function makeUI(log: Log, askAnswer = 0): UIHooks {
  return {
    deal: async (s) => void log.events.push(`deal:${s.round}`),
    botCommit: async (p, c) => void log.events.push(`commit:${p}:${c}`),
    reveal: async (plays) => void log.events.push(`reveal:${plays.map((p) => p.card).join(',')}`),
    resolve: async (events: readonly EngineEvent[], player) => {
      for (const e of events) log.events.push(`${e.type}:${player}`);
    },
    askRowChoice: async () => {
      log.asks++;
      return askAnswer; // any row index is a legal answer
    },
    roundStart: async (r) => void log.events.push(`round:${r}`),
    handEnd: async () => void log.events.push('handEnd'),
    scoreboard: async () => {
      log.scoreboards++;
      log.events.push('scoreboard');
    },
    matchEnd: async (w) => {
      log.matchEnds.push(...w);
      log.events.push(`matchEnd:${w.join(',')}`);
    },
  };
}

/** localStorage shim for the node test environment. */
function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

describe('MatchController', () => {
  it('plays a full match to completion with a scripted UI', async () => {
    installLocalStorage();
    const log: Log = { events: [], asks: 0, scoreboards: 0, matchEnds: [] };
    const rng = seeded(11);
    const controller = MatchController.create('normal', NAMES, makeUI(log), rng);

    await controller.start();
    let guard = 0;
    while (controller.phase !== 'matchEnd') {
      if (++guard > 2000) throw new Error('controller did not finish');
      if (controller.phase === 'choosing') {
        const card = chooseCard(controller.state, 0, { policy: 'greedy-dump', rng });
        await controller.humanPlay(card);
      } else {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    expect(log.matchEnds.length).toBeGreaterThan(0);
    expect(log.scoreboards).toBeGreaterThanOrEqual(1);
    expect(log.events.filter((e) => e.startsWith('reveal:')).length).toBeGreaterThanOrEqual(10);
    expect(log.events.filter((e) => e.startsWith('round:')).length).toBeGreaterThanOrEqual(10);
    expect(isMatchOver(controller.state)).toBe(true);
    expect(loadMatch()).toBeNull(); // cleared at match end
  }, 30_000);

  it('saves the match at the round boundary and resumes it', async () => {
    installLocalStorage();
    clearMatch();
    const log: Log = { events: [], asks: 0, scoreboards: 0, matchEnds: [] };
    const rng = seeded(22);
    const controller = MatchController.create('normal', NAMES, makeUI(log), rng);
    await controller.start();

    const card = chooseCard(controller.state, 0, { policy: 'greedy-dump', rng });
    await controller.humanPlay(card);

    const saved = loadMatch();
    expect(saved).not.toBeNull();
    expect(saved!.state.round).toBe(1);
    expect(saved!.state.players[0].hand).toHaveLength(9);

    const log2: Log = { events: [], asks: 0, scoreboards: 0, matchEnds: [] };
    const c2 = new MatchController(saved!.state, makeUI(log2), seeded(33));
    await c2.resume();
    expect(c2.phase).toBe('choosing');
    expect(log2.events).toContain('deal:1');
    expect(log2.events).toContain('round:1');
  }, 30_000);

  it('asks the human to choose a row when the card is lower than all ends', async () => {
    installLocalStorage();
    const log: Log = { events: [], asks: 0, scoreboards: 0, matchEnds: [] };
    const ui = makeUI(log, 2);
    const state = createMatch('normal', NAMES, seeded(44));
    // Fully scripted table: every bot card lands safely, human's 5 is lower
    // than all row ends and must choose a row.
    state.rows = [[30], [50], [70], [90]];
    state.players[0].hand = [5, 60, 61, 62, 63, 64, 65, 66, 67, 68];
    state.players[1].hand = [31, 32, 33, 34, 35, 36, 37, 38, 39, 40];
    state.players[2].hand = [41, 42, 43, 44, 45, 46, 47, 48, 49, 51];
    state.players[3].hand = [52, 53, 54, 55, 56, 57, 58, 59, 69, 71];
    state.players[4].hand = [72, 73, 74, 75, 76, 77, 78, 79, 80, 81];
    const controller = new MatchController(state, ui, seeded(44));

    await controller.start();
    await controller.humanPlay(5);

    expect(log.asks).toBe(1);
    expect(state.rows[2]).toEqual([5]); // chosen row gathered, played card stays
    expect(state.players[0].handScore).toBe(totalBullheads([70])); // human scored
    expect(controller.phase).toBe('choosing');
    expect(state.round).toBe(1);
  }, 30_000);

  it('ignores human input outside the choosing phase', async () => {
    installLocalStorage();
    const log: Log = { events: [], asks: 0, scoreboards: 0, matchEnds: [] };
    const controller = MatchController.create('normal', NAMES, makeUI(log), seeded(55));
    await controller.start();
    const before = controller.state.players[0].hand.length;
    await controller.humanPlay(104); // not held → ignored
    expect(controller.state.players[0].hand).toHaveLength(before);
    expect(controller.phase).toBe('choosing');
  });
});
