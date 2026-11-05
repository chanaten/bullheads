/** Arcade-neon palette and layout constants (locked decisions Q12/Q27). */

export const COLORS = {
  bg: 0x12102a,
  bgDeep: 0x0b0a1e,
  grid: 0x2a2660,
  felt: 0x1a1740,
  feltEdge: 0x252158,
  ink: 0xe8e6ff,
  inkDim: 0x9a94d6,
  cyan: 0x4df3ff,
  magenta: 0xff4dd8,
  yellow: 0xffd84d,
  danger: 0xff4d6d,
  cardFace: 0xf4f3ff,
  cardFaceHi: 0xffffff,
  cardBack: 0x241f55,
  cardBackLine: 0x4df3ff,
  shadow: 0x000000,
  seatGlow: 0x4df3ff,
} as const;

/** Seats: 0 = human (bottom), 1-2 = left side, 3-4 = right side. */
export const SEAT_SIDE: ('bottom' | 'left' | 'right')[] = ['bottom', 'left', 'left', 'right', 'right'];

export interface CardMetrics {
  w: number;
  h: number;
  radius: number;
}

/** Compute card size + row/hand geometry for the current screen. */
export interface Layout {
  screenW: number;
  screenH: number;
  /** Cards in the four central rows. */
  rowCard: CardMetrics;
  rowGapX: number;
  rowGapY: number;
  rowOriginX: number;
  rowOriginY: number;
  rowY: (index: number) => number;
  /** Human hand cards. */
  handCard: CardMetrics;
  handY: number;
  /** Staging slots where played cards land face-down before reveal. */
  staging: { x: number; y: number }[];
  /** Seat anchors (avatar + stack + score badge). */
  seats: { x: number; y: number }[];
  /** Score badge anchors (per seat). */
  badges: { x: number; y: number }[];
  roundLine: { x: number; y: number; w: number };
}

const ROW_SLOTS = 6; // max visible in a row (5 + incoming)

export function computeLayout(w: number, h: number): Layout {
  const landscape = w >= h;
  const pad = Math.max(12, w * 0.015);

  // Row cards: fit4 rows vertically in the central band.
  const rowBandH = h * (landscape ? 0.66 : 0.6);
  const rowCardH = Math.min((rowBandH - 3 * (h * 0.02)) / 4, h * 0.16);
  const rowCard: CardMetrics = {
    h: rowCardH,
    w: rowCardH * 0.72,
    radius: Math.max(4, rowCardH * 0.09),
  };
  const rowGapX = rowCard.w * 0.1;
  const rowGapY = rowCard.h * 0.14;

  const rowsW = ROW_SLOTS * rowCard.w + (ROW_SLOTS - 1) * rowGapX;
  const rowsH = 4 * rowCard.h + 3 * rowGapY;
  const rowOriginX = (w - rowsW) / 2;
  const rowOriginY = (h - rowsH) / 2 - h * 0.03;
  const rowY = (i: number) => rowOriginY + i * (rowCard.h + rowGapY);

  // Hand: bottom band, larger cards, overlapping when many.
  const handCardH = Math.min(h * 0.2, (h * 0.26));
  const handCard: CardMetrics = {
    h: handCardH,
    w: handCardH * 0.72,
    radius: Math.max(6, handCardH * 0.08),
  };
  const handY = h - handCard.h - pad - h * 0.045;

  // Seats: two per side, vertically centered around the rows band.
  const seatX = pad + w * 0.055;
  const seats: { x: number; y: number }[] = [{ x: w / 2, y: h - pad - 4 }];
  const sideY = [rowOriginY + rowsH * 0.28, rowOriginY + rowsH * 0.72];
  seats.push({ x: seatX, y: sideY[0] });
  seats.push({ x: seatX, y: sideY[1] });
  seats.push({ x: w - seatX, y: sideY[0] });
  seats.push({ x: w - seatX, y: sideY[1] });

  // Staging: between seat and rows.
  const staging: { x: number; y: number }[] = [{ x: w / 2, y: handY - handCard.h * 0.85 }];
  for (const side of ['left', 'right'] as const) {
    for (let i = 0; i < 2; i++) {
      const s = side === 'left' ? seats[1 + i] : seats[3 + i];
      staging.push({
        x: side === 'left' ? s.x + w * 0.11 : s.x - w * 0.11,
        y: s.y,
      });
    }
  }
  // Staging order must match seat ids: [0]=bottom, [1][2]=left, [3][4]=right.

  const badges = seats.map((s, i) =>
    i === 0
      ? { x: s.x, y: s.y - 10 }
      : { x: s.x + (i <= 2 ? w * 0.045 : -w * 0.045), y: s.y + h * 0.075 },
  );

  const roundLine = {
    x: w / 2 - Math.min(240, w * 0.2),
    y: handY - handCard.h * 0.28,
    w: Math.min(480, w * 0.4),
  };

  return {
    screenW: w,
    screenH: h,
    rowCard,
    rowGapX,
    rowGapY,
    rowOriginX,
    rowOriginY,
    rowY,
    handCard,
    handY,
    staging,
    seats,
    badges,
    roundLine,
  };
}
