/** Title screen: neon marquee BULLHEADS! + PLAY / TUTORIAL / RULES + gear. */

import { t } from '../i18n';
import { loadMatch } from '../state/persistence';
import type { Difficulty } from '../engine/rules';
import { btn, clearScreens, el, uiRoot } from './dom';

export interface MenuActions {
  onPlay: () => void;
  onTutorial: () => void;
  onRules: () => void;
  onSettings: () => void;
  onResume: (difficulty: Difficulty) => void;
}

export function showMenu(actions: MenuActions): void {
  clearScreens();
  const root = uiRoot();
  const saved = loadMatch();

  const screen = el('div', 'screen menu-screen');

  const title = el('div', 'marquee');
  title.innerHTML = `
    <div class="bulbs" aria-hidden="true">${'<i></i>'.repeat(24)}</div>
    <h1 class="neon-title">BULLHEADS!</h1>
    <div class="neon-sub">${t('menu.subtitle')}</div>
  `;
  screen.appendChild(title);

  const nav = el('div', 'menu-nav');
  nav.appendChild(btn('menu.play', actions.onPlay, 'primary'));
  if (saved) {
    nav.appendChild(
      btn('menu.resume', () => actions.onResume(saved.state.difficulty)),
    );
  }
  nav.appendChild(btn('menu.tutorial', actions.onTutorial));
  nav.appendChild(btn('menu.rules', actions.onRules));
  screen.appendChild(nav);

  const gear = btn('menu.settings', actions.onSettings, 'gear-btn');
  gear.setAttribute('aria-label', 'settings');
  gear.textContent = '⚙';
  screen.appendChild(gear);

  root.appendChild(screen);
}
