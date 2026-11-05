/**
 * Screen manager: menu ↔ difficulty ↔ match, with settings, pause, and
 * resume wired together. This is the app's composition root.
 */

import type { Application } from 'pixi.js';
import type { Difficulty } from '../engine/rules';
import { initAudio } from '../audio/engine';
import { audio } from '../audio/engine';
import { clearScreens } from './dom';
import { showMenu } from './menu';
import { showDifficulty } from './difficulty';
import { openSettings } from './settings';
import { showRules } from './rules';
import { openPause } from './pause';
import { mountGameHud } from './hud';
import { showScorePeek } from './overlays';
import { startGame, type GameHandle } from './shell';

export function startApp(app: Application): void {
  // Audio needs a user gesture (autoplay policy): start on first interaction.
  const onFirstGesture = (): void => {
    initAudio();
    window.removeEventListener('pointerdown', onFirstGesture);
    window.removeEventListener('keydown', onFirstGesture);
  };
  window.addEventListener('pointerdown', onFirstGesture);
  window.addEventListener('keydown', onFirstGesture);
  (window as unknown as Record<string, unknown>).__audio = audio;

  let game: GameHandle | null = null;
  let hudOff: (() => void) | null = null;
  let peekOff: (() => void) | null = null;

  // Hold Tab for a standings peek during a match (Q19).
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !game || peekOff) return;
    e.preventDefault();
    peekOff = showScorePeek(game.controller.state);
  });
  window.addEventListener('keyup', (e) => {
    if (e.key !== 'Tab') return;
    peekOff?.();
    peekOff = null;
  });

  const teardownGame = (): void => {
    peekOff?.();
    peekOff = null;
    hudOff?.();
    hudOff = null;
    game?.destroy();
    game = null;
    clearScreens();
  };

  const launchMatch = (difficulty: Difficulty, resume: boolean): void => {
    teardownGame();

    let closePause: (() => void) | null = null;

    game = startGame(app, difficulty, {
      resume,
      onRematch: () => launchMatch(difficulty, false),
      onMenu: () => {
        teardownGame();
        showMainMenu();
      },
    });

    const table = game.table;
    hudOff = mountGameHud({
      onPause: () => {
        if (closePause) return;
        table.setPaused(true);
        closePause = openPause({
          onResume: () => {
            closePause = null;
            table.setPaused(false);
          },
          onSettings: () => {
            openSettings(() => {
              /* stay paused behind the modal */
            });
          },
          onLeave: () => {
            // Save persists (round-boundary); Resume match re-enters it.
            closePause = null;
            teardownGame();
            showMainMenu();
          },
        });
      },
    });
  };

  const showMainMenu = (): void => {
    clearScreens();
    showMenu({
      onPlay: () => showDifficulty((d) => launchMatch(d, false), showMainMenu),
      onTutorial: () => showTutorial(),
      onRules: () => showRules(showMainMenu),
      onSettings: () => openSettings(() => showMainMenu()),
      onResume: (d) => launchMatch(d, true),
    });
  };

  const showTutorial = (): void => {
    void import('./tutorial').then(({ startTutorial }) => {
      startTutorial(app, showMainMenu);
    });
  };

  showMainMenu();
}
