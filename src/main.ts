/**
 * Boot: PixiJS stage (indigo grid backdrop) → app screen manager.
 */

import './styles.css';
import { Application, Container, Graphics } from 'pixi.js';
import gsap from 'gsap';
import { startApp } from './ui/app';

const BG = 0x12102a;
const GRID = 0x2a2660;

function buildBackdrop(app: Application): { root: Container; redraw: () => void } {
  const root = new Container();
  const grid = new Graphics();
  root.addChild(grid);

  const redraw = (): void => {
    const { width, height } = app.screen;
    grid.clear();
    grid.setStrokeStyle({ width: 1, color: GRID, alpha: 0.5 });
    const step = 64;
    for (let x = 0; x <= width; x += step) {
      grid.moveTo(x, 0);
      grid.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += step) {
      grid.moveTo(0, y);
      grid.lineTo(width, y);
    }
    grid.stroke();
  };
  redraw();
  return { root, redraw };
}

async function boot(): Promise<void> {
  // Advance tweens by wall-time even in throttled/hidden tabs, so beats never
  // crawl in slow motion when the window is occluded.
  gsap.ticker.lagSmoothing(0);

  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
  if (!canvas) throw new Error('missing #game-canvas');

  const app = new Application();
  await app.init({
    canvas,
    background: BG,
    resizeTo: window,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });

  const backdrop = buildBackdrop(app);
  app.stage.addChild(backdrop.root);
  const onResize = (): void => backdrop.redraw();
  app.renderer.on('resize', onResize);
  window.addEventListener('beforeunload', () => {
    app.renderer.off('resize', onResize);
    backdrop.root.destroy({ children: true });
  });

  startApp(app);
  document.documentElement.dataset.booted = 'true';
}

void boot();
