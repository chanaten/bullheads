/**
 * Boot: PixiJS stage (starfield + softened grid backdrop) → app screen manager.
 */

import './styles.css';
import { Application, Container, Graphics, type Ticker } from 'pixi.js';
import gsap from 'gsap';
import { startApp } from './ui/app';
import { motionFull } from './render/motion';

const BG = 0x12102a;
const GRID = 0x2a2660;

/** Slow parallax drift, px/sec per layer (static under reduced motion). */
const STAR_SPEEDS = [3, 7, 13];
const STAR_SPECS = [
  { size: 1.2, alpha: 0.35, tint: 0xffffff, density: 0.000045 },
  { size: 1.8, alpha: 0.5, tint: 0xcfe6ff, density: 0.000026 },
  { size: 2.4, alpha: 0.7, tint: 0x9fd8ff, density: 0.000013 },
];

interface Backdrop {
  root: Container;
  redraw: () => void;
  destroy: () => void;
}

function buildBackdrop(app: Application): Backdrop {
  const root = new Container();
  const grid = new Graphics();
  const starLayers: Container[] = [];

  // three parallax star layers, each drawn across 2× width for seamless wrap
  for (let i = 0; i < STAR_SPECS.length; i++) {
    const layer = new Container();
    starLayers.push(layer);
  }
  // stars behind, faint console grid over them
  for (const layer of starLayers) root.addChild(layer);
  root.addChild(grid);

  const redraw = (): void => {
    const { width, height } = app.screen;

    // softened grid
    grid.clear();
    grid.setStrokeStyle({ width: 1, color: GRID, alpha: 0.22 });
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

    // stars: two copies side by side so the wrap is seamless
    starLayers.forEach((layer, li) => {
      layer.removeChildren().forEach((c) => c.destroy());
      const spec = STAR_SPECS[li];
      const count = Math.max(24, Math.min(200, Math.round(width * height * spec.density)));
      const g = new Graphics();
      for (let copy = 0; copy < 2; copy++) {
        const ox = copy * width;
        for (let i = 0; i < count; i++) {
          const x = ox + Math.random() * width;
          const y = Math.random() * height;
          const warm = Math.random() < 0.12;
          g.circle(x, y, spec.size).fill({
            color: warm ? 0xffe9b0 : spec.tint,
            alpha: spec.alpha * (0.6 + Math.random() * 0.4),
          });
        }
      }
      layer.addChild(g);
    });
  };
  redraw();

  // slow drift — freezes entirely when motion is reduced
  const drift = (ticker: Ticker): void => {
    if (!motionFull()) return;
    const dt = ticker.deltaMS / 1000;
    const w = app.screen.width;
    starLayers.forEach((layer, i) => {
      layer.x -= STAR_SPEEDS[i] * dt;
      if (layer.x <= -w) layer.x += w;
    });
  };
  app.ticker.add(drift);

  return {
    root,
    redraw,
    destroy: () => {
      app.ticker.remove(drift);
      root.destroy({ children: true });
    },
  };
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
    backdrop.destroy();
  });

  startApp(app);
  document.documentElement.dataset.booted = 'true';
}

void boot();
