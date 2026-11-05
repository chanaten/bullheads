import { describe, expect, it } from 'vitest';
import { MatchController, type UIHooks } from '../src/state/controller';
import { chooseCard, chooseRow } from '../src/ai/bots';
import {
  type MatchState,
  createMatch,
  isMatchOver,
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

function makeUI(stateRef: { current: MatchState }): UIHooks {
  return {
    deal: async () => {},
    botCommit: async () => {},
    reveal: async () => {},
    resolve: async () => {},
    askRowChoice: async () => chooseRow(stateRef.current.rows),
    roundStart: async () => {},
    handEnd: async () => {},
    scoreboard: async () => {},
    matchEnd: async () => {},
  };
}

/** Simulate save→load (JSON roundtrip) exactly like localStorage does. */
function roundtrip(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}

describe('stress: controller + hard tier + resume cycles', () => {
  it('plays many full matches without engine errors', async () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = seeded(seed * 7919);
      const ref = { current: createMatch('hard', NAMES, rng) };
      let controller = new MatchController(ref.current, makeUI(ref), rng);
      await controller.start();

      let guard = 0;
      let roundsSinceResume = 0;
      while (controller.phase !== 'matchEnd') {
        if (++guard > 5000) throw new Error(`seed ${seed}: did not finish`);
        if (controller.phase === 'choosing') {
          const card = chooseCard(controller.state, 0, { policy: 'greedy-dump', rng });
          await controller.humanPlay(card);
          roundsSinceResume++;
          // JSON save/load cycle every 3 rounds (mimics leaving + resuming)
          if (roundsSinceResume % 3 === 0 && controller.phase === 'choosing') {
            const saved = roundtrip(controller.state);
            controller.dispose();
            ref.current = saved;
            controller = new MatchController(saved, makeUI(ref), rng);
            await controller.resume();
          }
        } else {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      expect(isMatchOver(controller.state)).toBe(true);
    }
  }, 120_000);
});
