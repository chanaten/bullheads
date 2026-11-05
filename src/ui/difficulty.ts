/** Difficulty select (Q32: PLAY → difficulty → straight into the deal). */

import { t } from '../i18n';
import type { Difficulty } from '../engine/rules';
import { clearScreens, el, uiRoot } from './dom';

export function showDifficulty(
  onPick: (d: Difficulty) => void,
  onBack: () => void,
): void {
  clearScreens();
  const screen = el('div', 'screen difficulty-screen');

  screen.appendChild(el('div', 'panel-title big', t('difficulty.title')));

  const row = el('div', 'difficulty-row');
  const tiers: { id: Difficulty; key: 'difficulty.normal' | 'difficulty.hard' | 'difficulty.asian'; desc: 'difficulty.normal.desc' | 'difficulty.hard.desc' | 'difficulty.asian.desc'; cls: string }[] = [
    { id: 'normal', key: 'difficulty.normal', desc: 'difficulty.normal.desc', cls: 'tier-normal' },
    { id: 'hard', key: 'difficulty.hard', desc: 'difficulty.hard.desc', cls: 'tier-hard' },
    { id: 'asian', key: 'difficulty.asian', desc: 'difficulty.asian.desc', cls: 'tier-asian' },
  ];
  for (const tier of tiers) {
    const card = el('button', `tier-card ${tier.cls}`);
    card.innerHTML = `<div class="tier-name">${t(tier.key)}</div><div class="tier-desc">${t(tier.desc)}</div>`;
    card.addEventListener('click', () => onPick(tier.id));
    row.appendChild(card);
  }
  screen.appendChild(row);

  const back = el('button', 'arcade-btn ghost', t('difficulty.back'));
  back.addEventListener('click', onBack);
  screen.appendChild(back);

  uiRoot().appendChild(screen);
}
