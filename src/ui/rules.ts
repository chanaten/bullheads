/** Rules help screen (Q15/Q32): official base rules, localized. */

import { t } from '../i18n';
import { clearScreens, el, uiRoot } from './dom';

export function showRules(onBack: () => void): void {
  clearScreens();
  const screen = el('div', 'screen rules-screen');
  screen.appendChild(el('div', 'panel-title big', t('rules.title')));

  const panel = el('div', 'panel rules-panel');
  const keys = [
    'rules.goal',
    'rules.deal',
    'rules.place',
    'rules.take',
    'rules.low',
    'rules.points',
  ] as const;
  for (const key of keys) {
    panel.appendChild(el('p', 'rule-line', t(key)));
  }
  screen.appendChild(panel);

  const back = el('button', 'arcade-btn primary', t('rules.back'));
  back.addEventListener('click', onBack);
  screen.appendChild(back);

  uiRoot().appendChild(screen);
}
