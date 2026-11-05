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
  /** Opponent card-pile anchors (outer edge of each side seat). */
  piles: { x: number; y: number }[];
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

  // Seats: each side seat is a column reading outward-in:
  //   [card pile] → [avatar + name] → [staging] → [rows]
  // so piles never overlap the icon/name and commits fly behind them.
  const pileHalf = rowCard.w * 0.57; // visual width incl. back-stack offset
  const avatarHalf = 26;
  const leftPileX = pad + pileHalf + 4;
  const leftAvatarX = leftPileX + pileHalf + 14 + avatarHalf;
  const avatarY = handY + rowCard.h + 34;
  const seats: { x: number; y: number }[] = [{ x: w / 2, y: avatarY }];
  const sideY = [rowOriginY + rowsH * 0.28, rowOriginY + rowsH * 0.72];
  seats.push({ x: leftAvatarX, y: sideY[0] });
  seats.push({ x: leftAvatarX, y: sideY[1] });
  seats.push({ x: w - leftAvatarX, y: sideY[0] });
  seats.push({ x: w - leftAvatarX, y: sideY[1] });

  const piles: { x: number; y: number }[] = [{ x: w / 2, y: avatarY }];
  piles.push({ x: leftPileX, y: sideY[0] });
  piles.push({ x: leftPileX, y: sideY[1] });
  piles.push({ x: w - leftPileX, y: sideY[0] });
  piles.push({ x: w - leftPileX, y: sideY[1] });

  // Staging sits midway between the avatar group and the rows so cards
  // never collide with either. Your card rises to the band above the hand.
  const staging: { x: number; y: number }[] = [
    { x: w / 2, y: rowsBottom + rowGapY + rowCard.h / 2 },
  ];
  const leftStagingX = (leftAvatarX + avatarHalf + rowOriginX) / 2;
  staging.push({ x: leftStagingX, y: sideY[0] });
  staging.push({ x: leftStagingX, y: sideY[1] });
  staging.push({ x: w - leftStagingX, y: sideY[0] });
  staging.push({ x: w - leftStagingX, y: sideY[1] });
  // Staging order must match seat ids: [0]=bottom, [1][2]=left, [3][4]=right.

  // Opponent score badges sit directly under their card piles.
  const badges = seats.map((s, i) =>
    i === 0
      ? { x: w - pad - 42, y: avatarY }
      : { x: piles[i].x, y: s.y + rowCard.h * 0.5 + 24 },
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
    piles,
    badges,
    roundLine,
  };
}
