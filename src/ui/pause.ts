/**
 * Pause menu (Q15): Resume / Settings / Main menu with leave-confirm (Q20-C).
 * Pausing gates the renderer between beats (Q31).
 */

import { t } from '../i18n';
import { el, onEscape, uiRoot } from './dom';

export interface PauseActions {
  onResume: () => void;
  onSettings: () => void;
  onLeave: () => void;
}

export function openPause(actions: PauseActions): () => void {
  const root = uiRoot();
  const overlay = el('div', 'overlay pause-overlay');
  const panel = el('div', 'panel');

  let confirming = false;

  const render = (): void => {
    panel.innerHTML = '';
    panel.appendChild(el('div', 'panel-title', t('pause.title')));

    if (!confirming) {
      const resume = el('button', 'arcade-btn primary', t('pause.resume'));
      resume.addEventListener('click', done);
      panel.appendChild(resume);

      const settings = el('button', 'arcade-btn', t('pause.settings'));
      settings.addEventListener('click', () => actions.onSettings());
      panel.appendChild(settings);

      const leave = el('button', 'arcade-btn danger', t('pause.menu'));
      leave.addEventListener('click', () => {
        confirming = true;
        render();
      });
      panel.appendChild(leave);
    } else {
      panel.appendChild(el('p', 'hint', t('pause.leaveConfirm')));
      const yes = el('button', 'arcade-btn danger', t('pause.leaveYes'));
      yes.addEventListener('click', () => {
        offEscape();
        overlay.remove();
        actions.onLeave();
      });
      panel.appendChild(yes);
      const no = el('button', 'arcade-btn', t('pause.leaveNo'));
      no.addEventListener('click', () => {
        confirming = false;
        render();
      });
      panel.appendChild(no);
    }
  };

  const offEscape = onEscape(() => {
    if (confirming) {
      confirming = false;
      render();
    } else {
      done();
    }
  });
  const done = (): void => {
    offEscape();
    overlay.remove();
    actions.onResume();
  };

  render();
  overlay.appendChild(panel);
  root.appendChild(overlay);
  return done;
}
