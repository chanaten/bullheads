/**
 * Screen manager: menu ↔ difficulty ↔ match, with settings, pause, and
 * resume wired together. This is the app's composition root.
 */

import type { Application } from 'pixi.js';
import type { Difficulty } from '../engine/rules';
import { clearScreens } from './dom';
import { showMenu } from './menu';
import { showDifficulty } from './difficulty';
import { openSettings } from './settings';
import { showRules } from './rules';
import { openPause } from './pause';
import { mountGameHud } from './hud';
import { startGame, type GameHandle } from './shell';

export function startApp(app: Application): void {
  let game: GameHandle | null = null;
  let hudOff: (() => void) | null = null;

  const teardownGame = (): void => {
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
