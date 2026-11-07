/**
 * Game shell: composes TableRenderer + MatchController + overlays into a
 * playable session. The menu/settings screens (next milestone) call in here.
 */

import type { Application } from 'pixi.js';
import gsap from 'gsap';
import { MatchController, type UIHooks } from '../state/controller';
import { loadMatch } from '../state/persistence';
import { TableRenderer } from '../render/table';
import { showMatchEnd, showScoreboard } from './overlays';
import { sampleRoster } from '../engine/roster';

export interface GameOptions {
  onRematch: () => void;
  onMenu: () => void;
  /** Resume a saved match instead of dealing a fresh one. */
  resume?: boolean;
}

export interface GameHandle {
  controller: MatchController;
  table: TableRenderer;
  destroy: () => void;
}

export function startGame(app: Application, opts: GameOptions): GameHandle {
  let controller!: MatchController;

  const table = new TableRenderer(app, {
    onPlay: (card) => controller.humanPlay(card),
    canInput: () => controller.phase === 'choosing',
  });

  const ui: UIHooks = {
    deal: (s) => table.deal(s),
    botCommit: (p, c) => table.botCommit(p, c),
    reveal: (plays) => table.reveal(plays),
    resolve: (events, p, c) => table.resolve(events, p, c),
    askRowChoice: (card) => table.askRowChoice(card),
    roundStart: (r) => table.roundStart(r),
    handEnd: (s) => table.handEnd(s),
    scoreboard: (s) => showScoreboard(s),
    matchEnd: (w, s) => showMatchEnd(w, s, { onRematch: opts.onRematch, onMenu: opts.onMenu }),
  };

  const saved = opts.resume ? loadMatch() : null;
  controller = saved
    ? new MatchController(saved.state, ui)
    : MatchController.create(['YOU', ...sampleRoster()], ui);

  void (saved ? controller.resume() : controller.start());

  // Dev/test aid (also used by automated verification).
  (window as unknown as Record<string, unknown>).__bh = { table, controller, app, gsap };

  return {
    controller,
    table,
    destroy: () => {
      controller.dispose();
      table.destroy();
      const w = window as unknown as Record<string, unknown>;
      if (w.__bh && (w.__bh as { table?: unknown }).table === table) {
        delete w.__bh;
      }
    },
  };
}
