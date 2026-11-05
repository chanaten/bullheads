/**
 * Boot: initializes the PixiJS stage (arcade-indigo backdrop) and hands off
 * to the screen shell. Screens/table live in src/ui and src/render.
 */

import './styles.css';
import { Application, Container, Graphics, Text } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

const BG = 0x12102a;
const GRID = 0x2a2660;
const CYAN = 0x4df3ff;

function buildBackdrop(app: Application): { root: Container; redraw: () => void } {
  const root = new Container();

  const grid = new Graphics();
  root.addChild(grid);

  const title = new Text({
    text: 'BULLHEADS!',
    style: {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: 72,
      fontWeight: '900',
      fill: 0xffffff,
      letterSpacing: 4,
    },
  });
  title.anchor.set(0.5);
  title.x = app.screen.width / 2;
  title.y = app.screen.height / 2 - 20;
  // Neon glow behind the white text.
  title.filters = [new GlowFilter({ color: CYAN, outerStrength: 1.4, innerStrength: 0.2 })];
  root.addChild(title);

  const sub = new Text({
    text: '6nimmt!',
    style: { fontFamily: 'Arial, sans-serif', fontSize: 18, fill: 0x9a94d6, letterSpacing: 10 },
  });
  sub.anchor.set(0.5);
  sub.x = title.x;
  sub.y = title.y + 64;
  root.addChild(sub);

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
    title.x = width / 2;
    title.y = height / 2 - 20;
    sub.x = width / 2;
    sub.y = title.y + 64;
  };
  redraw();

  return { root, redraw };
}

async function boot(): Promise<void> {
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
  app.renderer.on('resize', backdrop.redraw);

  // Screens (menu/settings/game) attach to #ui-root in the next milestone.
  document.documentElement.dataset.booted = 'true';
}

void boot();
