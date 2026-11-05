/**
 * DOM overlays for the match beats: end-of-hand scoreboard (Q16-D:
 * animated counters, click to continue), a hold-Tab standings peek (Q19),
 * and the match-end screen (Q36: banner + standings + Rematch/Main menu).
 */

import type { MatchState } from '../engine/rules';
import { MATCH_TARGET } from '../engine/rules';
import { play } from '../audio/sfx';
import { t } from '../i18n';
import { clearScreens, el, uiRoot } from './dom';

function clearOverlays(): void {
  for (const node of uiRoot().querySelectorAll('.overlay')) node.remove();
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

function standingRow(row: { id: number; name: string; score: number; hand: number }, showDelta: boolean): HTMLElement {
  const div = el(
    'div',
    `standing${row.id === 0 ? ' you' : ''}${row.score >= MATCH_TARGET ? ' over' : ''}`,
  );
  div.innerHTML = `
    <span class="who">${row.name}</span>
    <span class="delta">${showDelta ? `+${row.hand}` : ''}</span>
    <span class="score">${row.score}</span>
  `;
  return div;
}

/** End-of-hand scoreboard; resolves when the player continues. */
export function showScoreboard(state: MatchState): Promise<void> {
  clearOverlays();
  play('handEnd');
  const matchEnding = state.players.some((p) => p.score >= MATCH_TARGET);

  const overlay = el('div', 'overlay');
  const panel = el('div', 'panel scoreboard');
  panel.appendChild(el('div', 'panel-title', t('score.title')));
  const list = el('div', 'standings');
  for (const row of standings(state)) list.appendChild(standingRow(row, true));
  panel.appendChild(list);
  const cont = el(
    'button',
    'arcade-btn primary continue',
    t(matchEnding ? 'score.results' : 'score.continue'),
  );
  panel.appendChild(cont);
  panel.appendChild(el('div', 'hint', t('score.hint')));
  overlay.appendChild(panel);
  uiRoot().appendChild(overlay);

  return new Promise((resolve) => {
    const done = (): void => {
      off();
      play('uiClick');
      overlay.remove();
      resolve();
    };
    const off = keyOnce(done);
    cont.addEventListener('click', done);
  });
}

/** Read-only standings peek (hold Tab during a match, Q19). */
export function showScorePeek(state: MatchState): () => void {
  const overlay = el('div', 'overlay peek-overlay');
  const panel = el('div', 'panel scoreboard');
  panel.appendChild(el('div', 'panel-title', t('score.title')));
  const list = el('div', 'standings');
  for (const row of standings(state)) list.appendChild(standingRow(row, true));
  panel.appendChild(list);
  panel.appendChild(el('div', 'hint', t('score.peekHint')));
  overlay.appendChild(panel);
  uiRoot().appendChild(overlay);
  return () => overlay.remove();
}

/** Match end: banner + final standings + Rematch / Main menu. */
export function showMatchEnd(
  winners: number[],
  state: MatchState,
  actions: { onRematch: () => void; onMenu: () => void },
): Promise<void> {
  clearOverlays();
  clearScreens();
  const won = winners.includes(0);
  const draw = won && winners.length > 1;
  const title = draw ? t('end.draw') : won ? t('end.win') : t('end.lose');
  const tone = draw ? 'draw' : won ? 'win' : 'lose';
  play(won ? 'victory' : 'defeat');

  const overlay = el('div', `overlay match-end ${tone}`);
  const panel = el('div', 'panel');
  panel.appendChild(el('div', `banner ${tone}`, title));
  const list = el('div', 'standings final');
  for (const row of standings(state)) {
    const crown = winners.includes(row.id) ? '👑 ' : '';
    const div = el('div', `standing${row.id === 0 ? ' you' : ''}`);
    div.innerHTML = `<span class="who">${crown}${row.name}</span><span class="score">${row.score}</span>`;
    list.appendChild(div);
  }
  panel.appendChild(list);
  const rowBtns = el('div', 'btn-row');
  const rematch = el('button', 'arcade-btn primary rematch', t('end.rematch'));
  const menu = el('button', 'arcade-btn menu', t('end.menu'));
  rowBtns.appendChild(rematch);
  rowBtns.appendChild(menu);
  panel.appendChild(rowBtns);
  overlay.appendChild(panel);
  uiRoot().appendChild(overlay);

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
    rematch.addEventListener('click', () => finish(actions.onRematch));
    menu.addEventListener('click', () => finish(actions.onMenu));
  });
}
