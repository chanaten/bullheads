/**
 * Card visuals: vector-drawn faces (big number + bullhead icons with danger
 * color-coding, foil sheen above 70) and neon card backs. No image assets.
 */

import { Container, Graphics, Text } from 'pixi.js';
import { bullheads } from '../engine/cards';
import { COLORS, type CardMetrics } from './theme';

/** Danger tint by bullhead count (shape+color, never color alone). */
function dangerColor(bh: number): number {
  if (bh >= 7) return COLORS.danger;
  if (bh === 5) return COLORS.yellow;
  if (bh === 3) return 0x8f8ab8;
  return 0x6b66a0;
}

/** Small bull-head glyph: face + horns + eyes. */
export function drawBullhead(g: Graphics, x: number, y: number, s: number, color: number): void {
  const r = s * 0.5;
  // horns
  g.moveTo(x - r * 0.9, y - r * 0.35);
  g.quadraticCurveTo(x - r * 1.5, y - r * 1.25, x - r * 0.45, y - r * 1.05);
  g.moveTo(x + r * 0.9, y - r * 0.35);
  g.quadraticCurveTo(x + r * 1.5, y - r * 1.25, x + r * 0.45, y - r * 1.05);
  g.stroke({ width: Math.max(1, s * 0.16), color, cap: 'round' });
  // face
  g.ellipse(x, y, r, r * 0.88).fill(color);
  // snout
  g.ellipse(x, y + r * 0.32, r * 0.52, r * 0.34).fill({ color: 0x000000, alpha: 0.22 });
  // eyes (cut-outs)
  g.circle(x - r * 0.34, y - r * 0.12, Math.max(0.8, s * 0.1)).fill({ color: 0xffffff, alpha: 0.9 });
  g.circle(x + r * 0.34, y - r * 0.12, Math.max(0.8, s * 0.1)).fill({ color: 0xffffff, alpha: 0.9 });
}

function roundedRect(g: Graphics, w: number, h: number, r: number): void {
  g.roundRect(-w / 2, -h / 2, w, h, r);
}

export interface CardView {
  container: Container;
  /** Crossfade-free flip: call at scaleX≈0. */
  showFace: () => void;
  showBack: () => void;
}

export interface CardOptions {
  /**
   * Width guaranteed visible (hand cards overlap their neighbour's right
   * edge). Face content is sized and centered inside this strip so numbers
   * are never half-covered. Defaults to the full card width.
   */
  visibleWidth?: number;
}

/** A card that can display either its face or its back (for flips). */
export function createCard(value: number, m: CardMetrics, opts: CardOptions = {}): CardView {
  const container = new Container();

  // ---------- face ----------
  const face = new Container();
  const bh = bullheads(value);
  const danger = dangerColor(bh);
  const isSeven = bh >= 7;
  const isFive = bh === 5;
  const foil = value >= 70;

  const pad = m.w * 0.06;
  const visible = Math.max(m.w * 0.4, Math.min(opts.visibleWidth ?? m.w, m.w));
  const maxContentW = visible - pad;
  // content sits centered inside the visible strip
  const contentX = -m.w / 2 + visible / 2;

  const bg = new Graphics();
  roundedRect(bg, m.w, m.h, m.radius);
  bg.fill(foil ? COLORS.cardFaceHi : COLORS.cardFace);
  // danger border: 1/2/3 neutral, 5 gold, 7 red
  bg.stroke({
    width: Math.max(1.5, m.h * 0.03),
    color: isSeven ? COLORS.danger : isFive ? COLORS.yellow : 0xb9b4e0,
    alpha: isSeven || isFive ? 0.95 : 0.6,
  });
  face.addChild(bg);

  if (foil) {
    const streak = new Graphics();
    streak.poly([
      -m.w * 0.5,
      m.h * 0.18,
      m.w * 0.18,
      -m.h * 0.5,
      m.w * 0.38,
      -m.h * 0.5,
      -m.w * 0.3,
      m.h * 0.5,
      -m.w * 0.5,
      m.h * 0.5,
    ]);
    streak.fill({ color: 0xffffff, alpha: 0.35 });
    face.addChild(streak);
  }

  const label = String(value);
  // Arial Black digit ≈ 0.62em wide — fit the visible strip
  const fontSize = Math.min(
    Math.floor(m.h * 0.4),
    Math.floor(maxContentW / (label.length * 0.62)),
  );
  const num = new Text({
    text: label,
    style: {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize,
      fontWeight: '900',
      fill: isSeven ? 0xb01030 : 0x1a1740,
    },
  });
  num.anchor.set(0.5);
  num.x = contentX;
  num.y = -m.h * 0.08;
  face.addChild(num);

  // bullhead icons in one adaptive row, also inside the visible strip
  const gap = Math.max(1, m.h * 0.025);
  const iconS = Math.min(m.h * 0.14, maxContentW / bh - gap);
  const rowW = bh * iconS + (bh - 1) * gap;
  const icons = new Graphics();
  for (let i = 0; i < bh; i++) {
    drawBullhead(
      icons,
      contentX - rowW / 2 + iconS / 2 + i * (iconS + gap),
      m.h * 0.27,
      iconS,
      danger,
    );
  }
  face.addChild(icons);

  // ---------- back ----------
  const back = new Container();
  const bb = new Graphics();
  roundedRect(bb, m.w, m.h, m.radius);
  bb.fill(COLORS.cardBack);
  bb.stroke({ width: Math.max(1.5, m.h * 0.03), color: COLORS.cardBackLine, alpha: 0.85 });
  bb.roundRect(-m.w * 0.4, -m.h * 0.4, m.w * 0.8, m.h * 0.8, m.radius * 0.6);
  bb.stroke({ width: Math.max(1, m.h * 0.015), color: COLORS.cardBackLine, alpha: 0.35 });
  back.addChild(bb);
  const glyph = new Graphics();
  drawBullhead(glyph, 0, 0, Math.min(m.w, m.h) * 0.4, COLORS.cardBackLine);
  back.addChild(glyph);

  back.visible = false;
  container.addChild(face, back);

  return {
    container,
    showFace: () => {
      face.visible = true;
      back.visible = false;
    },
    showBack: () => {
      face.visible = false;
      back.visible = true;
    },
  };
}

/** A short stack of card backs for an opponent's hand. */
export function createBackStack(m: CardMetrics, count: number): Container {
  const stack = new Container();
  const layers = Math.min(3, Math.max(1, Math.ceil(count / 4)));
  for (let i = layers - 1; i >= 0; i--) {
    const g = new Graphics();
    roundedRect(g, m.w, m.h, m.radius);
    g.fill(COLORS.cardBack);
    g.stroke({ width: Math.max(1.5, m.h * 0.045), color: COLORS.cardBackLine, alpha: 0.85 });
    g.x = i * m.w * 0.07;
    g.y = -i * m.h * 0.05;
    stack.addChild(g);
  }
  return stack;
}
