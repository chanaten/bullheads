/** In-game corner HUD: ×2 speed toggle (left) + pause button (right). */

import { t } from '../i18n';
import { getSettings, onSettingsChange, updateSettings } from '../state/settingsStore';
import { el, uiRoot } from './dom';

export interface HudHandles {
  onPause: () => void;
}

export function mountGameHud(handles: HudHandles): () => void {
  const root = uiRoot();

  const speed = el('button', 'hud-btn speed-btn');
  const renderSpeed = (): void => {
    speed.textContent = getSettings().speed === 2 ? '×2' : '×1';
    speed.classList.toggle('on', getSettings().speed === 2);
  };
  renderSpeed();
  speed.addEventListener('click', () => {
    updateSettings({ speed: getSettings().speed === 2 ? 1 : 2 });
    renderSpeed();
  });

  const pause = el('button', 'hud-btn pause-btn', t('game.pause'));
  pause.setAttribute('aria-label', 'pause');
  pause.addEventListener('click', handles.onPause);

  root.appendChild(speed);
  root.appendChild(pause);

  const offSettings = onSettingsChange(renderSpeed);

  return () => {
    offSettings();
    speed.remove();
    pause.remove();
  };
}
