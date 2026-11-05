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
  const pad = Math.max(12, w * 0.015);
  const topMargin = 46;
  const bottomStrip = 80;

  // One shared card size for rows and hand (hand never overlaps): the
  // vertical budget covers rows band + staging band + hand band.
  const rowCardH = Math.min(
    (h - topMargin - bottomStrip) / 6.7,
    (w * 0.92) / 7.85,
    h * 0.17,
  );
  const rowCard: CardMetrics = {
    h: rowCardH,
    w: rowCardH * 0.72,
    radius: Math.max(4, rowCardH * 0.08),
  };
  const rowGapX = rowCard.w * 0.1;
  const rowGapY = rowCard.h * 0.14;

  const rowsW = ROW_SLOTS * rowCard.w + (ROW_SLOTS - 1) * rowGapX;
  const rowsH = 4 * rowCard.h + 3 * rowGapY;
  const rowOriginX = (w - rowsW) / 2;
  const rowOriginY = topMargin;
  const rowY = (i: number) => rowOriginY + i * (rowCard.h + rowGapY);
  const rowsBottom = rowOriginY + rowsH;

  // Hand: same size as the row cards, spaced with the same gap — no overlap.
  const handCard = rowCard;
  const handY = rowsBottom + rowGapY * 2 + rowCard.h;

  // Seats: two per side, vertically centered around the rows band.
  const seatX = pad + w * 0.055;
  const avatarY = handY + rowCard.h + 34;
  const seats: { x: number; y: number }[] = [{ x: w / 2, y: avatarY }];
  const sideY = [rowOriginY + rowsH * 0.28, rowOriginY + rowsH * 0.72];
  seats.push({ x: seatX, y: sideY[0] });
  seats.push({ x: seatX, y: sideY[1] });
  seats.push({ x: w - seatX, y: sideY[0] });
  seats.push({ x: w - seatX, y: sideY[1] });

  // Staging: your card rises to the band between rows and hand; bot cards
  // commit beside their seats.
  const staging: { x: number; y: number }[] = [
    { x: w / 2, y: rowsBottom + rowGapY + rowCard.h / 2 },
  ];
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
      ? { x: w - pad - 42, y: avatarY }
      : { x: s.x + (i <= 2 ? w * 0.048 : -w * 0.048), y: s.y + rowCard.h * 0.62 + 20 },
  );

  const roundLine = {
    x: pad + 14,
    y: avatarY + 18,
    w: Math.min(200, w * 0.16),
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
