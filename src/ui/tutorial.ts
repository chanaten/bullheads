/**
 * Scripted tutorial (Q39-A): a crafted demo hand with guaranteed teaching
 * moments — nearest-lower landing, rows filling up, the 6th-card take, and
 * the forced low-card choice — narrated between rounds with localized
 * banners. Skip (button or Esc) is always available.
 */

import type { Application } from 'pixi.js';
import gsap from 'gsap';
import { chooseRow } from '../ai/bots';
import { t, type StringKey } from '../i18n';
import {
  type MatchState,
  consumeCard,
  createMatch,
  findTargetRow,
  placeCard,
  resolveOrder,
} from '../engine/rules';
import { updateSettings } from '../state/settingsStore';
import { TableRenderer } from '../render/table';
import { clearScreens, el, uiRoot } from './dom';

interface TutorialStep {
  title: StringKey;
  body: StringKey;
  humanCard: number;
  bots: { player: number; card: number }[];
  afterTitle: StringKey;
  afterBody: StringKey;
  final?: boolean;
}

const STEPS: TutorialStep[] = [
  {
    title: 'tut.step1.title',
    body: 'tut.step1.body',
    humanCard: 65,
    bots: [
      { player: 1, card: 12 },
      { player: 3, card: 71 },
      { player: 4, card: 91 },
    ],
    afterTitle: 'tut.land.title',
    afterBody: 'tut.land.body',
  },
  {
    title: 'tut.step2.title',
    body: 'tut.step2.body',
    humanCard: 13,
    bots: [
      { player: 1, card: 14 },
      { player: 2, card: 66 },
      { player: 3, card: 72 },
      { player: 4, card: 92 },
    ],
    afterTitle: 'tut.fill.title',
    afterBody: 'tut.fill.body',
  },
  {
    title: 'tut.step3.title',
    body: 'tut.step3.body',
    humanCard: 15,
    bots: [
      { player: 1, card: 16 },
      { player: 2, card: 67 },
      { player: 3, card: 73 },
      { player: 4, card: 93 },
    ],
    afterTitle: 'tut.take.title',
    afterBody: 'tut.take.body',
  },
  {
    title: 'tut.step4.title',
    body: 'tut.step4.body',
    humanCard: 4,
    bots: [
      { player: 1, card: 17 },
      { player: 2, card: 68 },
      { player: 3, card: 74 },
      { player: 4, card: 94 },
    ],
    afterTitle: 'tut.finish.title',
    afterBody: 'tut.finish.body',
    final: true,
  },
];

/** Crafted demo state: rows and hands that guarantee the four lessons. */
function craftedState(): MatchState {
  const state = createMatch('normal', ['YOU', 'Nyx', 'Flux', 'Rook', 'Kira'], () => 0.42);
  state.rows = [[11], [50], [70], [90]];
  state.players[0].hand = [4, 13, 15, 45, 65, 80, 85, 95, 100, 104];
  state.players[1].hand = [12, 14, 16, 17];
  state.players[2].hand = [66, 67, 68];
  state.players[3].hand = [71, 72, 73, 74];
  state.players[4].hand = [91, 92, 93, 94];
  state.round = 0;
  return state;
}

function showBanner(
  titleKey: StringKey,
  bodyKey: StringKey,
  opts: { final?: boolean } = {},
): Promise<'continue' | 'skip'> {
  const overlay = el('div', 'overlay tutorial-overlay');
  const panel = el('div', 'panel tutorial-panel');
  panel.appendChild(el('div', 'panel-title', t(titleKey)));
  panel.appendChild(el('p', 'tutorial-body', t(bodyKey)));

  const row = el('div', 'btn-row');
  const next = el('button', 'arcade-btn primary', t(opts.final ? 'tut.finish' : 'tut.next'));
  row.appendChild(next);
  const leave = el('button', 'arcade-btn ghost danger', t('tut.leave'));
  if (!opts.final) row.appendChild(leave);
  panel.appendChild(row);
  overlay.appendChild(panel);
  uiRoot().appendChild(overlay);

  return new Promise((resolve) => {
    const resolve_ = (action: 'continue' | 'skip'): void => {
      window.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(action);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        resolve_('continue');
      } else if (e.key === 'Escape' && !opts.final) {
        resolve_('skip');
      }
    };
    window.addEventListener('keydown', onKey);
    next.addEventListener('click', () => resolve_('continue'));
    if (!opts.final) leave.addEventListener('click', () => resolve_('skip'));
  });
}

export function startTutorial(app: Application, onFinish: () => void): void {
  clearScreens();
  const state = craftedState();
  let awaitingInput = false;
  let skipped = false;
  let script: TutorialStep | null = null;
  let onRoundDone: (() => void) | null = null;

  const table = new TableRenderer(app, {
    onPlay: async () => {
      await playRound();
      const done = onRoundDone;
      onRoundDone = null;
      done?.();
    },
    canInput: () => awaitingInput,
  });
  (window as unknown as Record<string, unknown>).__bh = { table, tutorial: true, gsap };

  async function playRound(): Promise<void> {
    if (!script) return;
    awaitingInput = false;
    const humanCard = script.humanCard;
    consumeCard(state, 0, humanCard);
    const plays: { player: number; card: number }[] = [{ player: 0, card: humanCard }];

    for (const bp of script.bots) {
      consumeCard(state, bp.player, bp.card);
      plays.push({ player: bp.player, card: bp.card });
      await table.botCommit(bp.player, bp.card);
    }

    await table.reveal(plays);
    for (const { player, card } of resolveOrder(plays)) {
      let row = findTargetRow(card, state.rows);
      if (row === null) {
        row = player === 0 ? await table.askRowChoice(card) : chooseRow(state.rows);
      }
      const events = placeCard(state, player, card, row);
      await table.resolve(events, player, card);
    }
    state.round++;
    await table.roundStart(state.round);
  }

  function waitPlayed(): Promise<boolean> {
    return new Promise((resolve) => {
      const finish = (ok: boolean): void => {
        window.removeEventListener('keydown', onKey);
        onRoundDone = null;
        if (!ok) skipped = true;
        resolve(ok);
      };
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') finish(false);
      };
      onRoundDone = () => finish(true);
      window.addEventListener('keydown', onKey);
    });
  }

  async function run(): Promise<void> {
    await table.deal(state);

    for (const step of STEPS) {
      if (skipped) break;
      const res = await showBanner(step.title, step.body);
      if (res === 'skip') {
        skipped = true;
        break;
      }
      script = step;
      awaitingInput = true;
      table.guideSelect(step.humanCard);

      const ok = await waitPlayed();
      table.guideSelect(null);
      if (!ok) break;

      const res2 = await showBanner(step.afterTitle, step.afterBody, { final: step.final });
      if (res2 === 'skip') {
        skipped = true;
        break;
      }
    }

    // completed (not left early) marks the tutorial as seen
    if (!skipped) updateSettings({ tutorialSeen: true });
    table.destroy();
    const w = window as unknown as Record<string, unknown>;
    if (w.__bh && (w.__bh as { table?: unknown }).table === table) delete w.__bh;
    onFinish();
  }

  void run();
}
