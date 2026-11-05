/**
 * DOM overlays for the match beats: end-of-hand scoreboard (Q16-D:
 * animated counters, click to continue) and the match-end screen (Q36:
 * banner + standings + Rematch/Main menu).
 */

import type { MatchState } from '../engine/rules';
import { MATCH_TARGET } from '../engine/rules';
import { play } from '../audio/sfx';

function root(): HTMLElement {
  return document.getElementById('ui-root')!;
}

function clearOverlays(): void {
  for (const el of root().querySelectorAll('.overlay')) el.remove();
}

function standings(state: MatchState): { id: number; name: string; score: number; hand: number }[] {
  return state.players
    .map((p) => ({ id: p.id, name: p.name, score: p.score, hand: p.handScore }))
    .sort((a, b) => a.score - b.score);
}

function keyOnce(handler: () => void): () => void {
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      handler();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

/** End-of-hand scoreboard; resolves when the player continues. */
export function showScoreboard(state: MatchState): Promise<void> {
  clearOverlays();
  play('handEnd');
  const matchEnding = state.players.some((p) => p.score >= MATCH_TARGET);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="panel scoreboard">
      <div class="panel-title">HAND COMPLETE</div>
      <div class="standings"></div>
      <button class="arcade-btn primary continue">${matchEnding ? 'RESULTS →' : 'NEXT HAND →'}</button>
      <div class="hint">click or press space</div>
    </div>
  `;
  root().appendChild(overlay);

  const list = overlay.querySelector('.standings')!;
  for (const row of standings(state)) {
    const div = document.createElement('div');
    div.className = `standing${row.id === 0 ? ' you' : ''}${row.score >= MATCH_TARGET ? ' over' : ''}`;
    div.innerHTML = `
      <span class="who">${row.name}</span>
      <span class="delta">+${row.hand}</span>
      <span class="score">${row.score}</span>
    `;
    list.appendChild(div);
    // count-up per row
    const scoreEl = div.querySelector('.score')!;
    const target = row.score;
    const obj = { v: Math.max(0, target - row.hand) };
    const tween = () => {
      const start = performance.now();
      const from = obj.v;
      const step = (now: number): void => {
        const p = Math.min(1, (now - start) / 550);
        scoreEl.textContent = String(Math.round(from + (target - from) * p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    tween();
  }

  return new Promise((resolve) => {
    const done = (): void => {
      off();
      play('uiClick');
      overlay.remove();
      resolve();
    };
    const off = keyOnce(done);
    overlay.querySelector<HTMLButtonElement>('.continue')!.addEventListener('click', done);
  });
}

/** Match end: banner + final standings + Rematch / Main menu. */
export function showMatchEnd(
  winners: number[],
  state: MatchState,
  actions: { onRematch: () => void; onMenu: () => void },
): Promise<void> {
  clearOverlays();
  const won = winners.includes(0);
  const draw = won && winners.length > 1;
  const title = draw ? 'DRAW!' : won ? 'YOU WIN!' : 'DEFEAT';
  const tone = draw ? 'draw' : won ? 'win' : 'lose';
  play(won ? 'victory' : 'defeat');

  const overlay = document.createElement('div');
  overlay.className = `overlay match-end ${tone}`;
  overlay.innerHTML = `
    <div class="panel">
      <div class="banner ${tone}">${title}</div>
      <div class="standings final"></div>
      <div class="btn-row">
        <button class="arcade-btn primary rematch">REMATCH</button>
        <button class="arcade-btn menu">MAIN MENU</button>
      </div>
    </div>
  `;
  root().appendChild(overlay);

  const list = overlay.querySelector('.standings.final')!;
  for (const row of standings(state)) {
    const div = document.createElement('div');
    const crown = winners.includes(row.id) ? '👑 ' : '';
    div.className = `standing${row.id === 0 ? ' you' : ''}`;
    div.innerHTML = `
      <span class="who">${crown}${row.name}</span>
      <span class="score">${row.score}</span>
    `;
    list.appendChild(div);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      off();
      play('uiClick');
      overlay.remove();
      fn();
      resolve();
    };
    const off = keyOnce(() => finish(actions.onRematch)); // Enter = rematch
    overlay.querySelector<HTMLButtonElement>('.rematch')!.addEventListener('click', () =>
      finish(actions.onRematch),
    );
    overlay.querySelector<HTMLButtonElement>('.menu')!.addEventListener('click', () =>
      finish(actions.onMenu),
    );
  });
}
