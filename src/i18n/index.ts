/**
 * i18n: English + Thai strings, one table from day one (Q34).
 * `t('key', params)` reads the current language from settings.
 */

import { getSettings, onSettingsChange } from '../state/settingsStore';

type Lang = 'en' | 'th';

const en = {
  'menu.play': 'PLAY',
  'menu.tutorial': 'TUTORIAL',
  'menu.rules': 'RULES',
  'menu.resume': 'RESUME MATCH',
  'menu.settings': 'Settings',
  'menu.subtitle': '6nimmt!',

  'difficulty.title': 'SELECT DIFFICULTY',
  'difficulty.normal': 'NORMAL',
  'difficulty.hard': 'HARD',
  'difficulty.asian': 'ASIAN MODE',
  'difficulty.normal.desc': 'Bots play by the book — no foresight.',
  'difficulty.hard.desc': 'Bots simulate a few moves ahead.',
  'difficulty.asian.desc': 'Bots count every card. Good luck.',
  'difficulty.back': 'BACK',

  'settings.title': 'SETTINGS',
  'settings.music': 'Ambient music',
  'settings.sfx': 'Sound effects',
  'settings.speed': 'Game speed',
  'settings.motion': 'Motion intensity',
  'settings.motion.full': 'Full',
  'settings.motion.reduced': 'Reduced',
  'settings.language': 'Language',
  'settings.close': 'CLOSE',

  'pause.title': 'PAUSED',
  'pause.resume': 'RESUME',
  'pause.settings': 'SETTINGS',
  'pause.menu': 'MAIN MENU',
  'pause.leaveConfirm': 'Leave the match? Progress is saved each round.',
  'pause.leaveYes': 'LEAVE',
  'pause.leaveNo': 'STAY',

  'rules.title': 'HOW TO PLAY',
  'rules.goal':
    'Goal: finish with the FEWEST penalty points (bullheads). A match ends when someone reaches 66 — lowest score wins.',
  'rules.deal': 'Each player gets 10 cards. Every round, everyone plays one card at the same time.',
  'rules.place':
    'Played cards go out lowest-first. Your card lands on the row whose last card is the nearest LOWER number.',
  'rules.take':
    'A row holds 5 cards. If your card would be the 6th, you take all 5 — and your card starts that row again.',
  'rules.low':
    'If your card is lower than every row, you must choose a row to take. Pick the one with the fewest bullheads.',
  'rules.points':
    'Bullheads: 55 has 7 · multiples of 11 have 5 · multiples of 10 have 3 · other multiples of 5 have 2 · the rest have 1.',
  'rules.back': 'BACK',

  'game.round': 'ROUND {n} / 10',
  'game.speed2': '×2',
  'game.pause': 'II',
  'game.rowPrompt': 'CARD {c} IS LOWER THAN EVERY ROW — TAKE ONE!',
  'game.you': 'YOU',

  'score.title': 'HAND COMPLETE',
  'score.continue': 'NEXT HAND →',
  'score.results': 'RESULTS →',
  'score.hint': 'click or press space',

  'end.win': 'YOU WIN!',
  'end.lose': 'DEFEAT',
  'end.draw': 'DRAW!',
  'end.rematch': 'REMATCH',
  'end.menu': 'MAIN MENU',

  'rotate.rotate': 'Rotate your device to landscape',
} as const;

export type StringKey = keyof typeof en;

const th: Record<StringKey, string> = {
  'menu.play': 'เล่น',
  'menu.tutorial': 'สอนเล่น',
  'menu.rules': 'กติกา',
  'menu.resume': 'เล่นต่อ',
  'menu.settings': 'ตั้งค่า',
  'menu.subtitle': '6nimmt!',

  'difficulty.title': 'เลือกระดับความยาก',
  'difficulty.normal': 'ปกติ',
  'difficulty.hard': 'ยาก',
  'difficulty.asian': 'โหมดเอเชีย',
  'difficulty.normal.desc': 'บอทเล่นตามกติกาง่าย ๆ ไม่คาดการณ์ล่วงหน้า',
  'difficulty.hard.desc': 'บอทจำลองเกมล่วงหน้าหลายไม้',
  'difficulty.asian.desc': 'บอทนับไพ่ทุกใบ ขอให้โชคดี',
  'difficulty.back': 'กลับ',

  'settings.title': 'ตั้งค่า',
  'settings.music': 'เพลงบรรเลง',
  'settings.sfx': 'เอฟเฟกต์เสียง',
  'settings.speed': 'ความเร็วเกม',
  'settings.motion': 'ระดับแอนิเมชัน',
  'settings.motion.full': 'เต็ม',
  'settings.motion.reduced': 'ลดลง',
  'settings.language': 'ภาษา',
  'settings.close': 'ปิด',

  'pause.title': 'หยุดชั่วคราว',
  'pause.resume': 'เล่นต่อ',
  'pause.settings': 'ตั้งค่า',
  'pause.menu': 'หน้าหลัก',
  'pause.leaveConfirm': 'ออกจากเกม? ความคืบหน้าจะบันทึกทุกตา',
  'pause.leaveYes': 'ออก',
  'pause.leaveNo': 'อยู่ต่อ',

  'rules.title': 'วิธีเล่น',
  'rules.goal':
    'เป้าหมาย: จบเกมด้วยคะแนนโทษ (หัวกระทิง) น้อยที่สุด เมื่อมีคนถึง 66 แต้ม เกมจะจบ และผู้ที่แต้มน้อยที่สุดชนะ',
  'rules.deal': 'ผู้เล่นแต่ละคนได้ไพ่คนละ 10 ใบ ทุกตาทุกคนวางไพ่พร้อมกัน',
  'rules.place': 'ไพ่จะถูกจัดจากน้อยไปมาก การ์ดของคุณจะลงแถวที่มีเลขท้ายใกล้เคียงน้อยกว่าที่สุด',
  'rules.take': 'แถวหนึ่งมีได้ 5 ใบ ถ้าการ์ดของคุณเป็นใบที่ 6 คุณต้องรับไพ่ทั้ง 5 ใบ และการ์ดของคุณจะเริ่มแถวนั้นใหม่',
  'rules.low': 'ถ้าการ์ดของคุณน้อยกว่าทุกแถว คุณต้องเลือกรับหนึ่งแถว เลือกแถวที่มีหัวกระทิงน้อยที่สุด',
  'rules.points':
    'หัวกระทิง: ไพ่ 55 มี 7 หัว · ไพ่ที่หาร 11 ลงตัวมี 5 · หาร 10 ลงตัวมี 3 · หาร 5 ลงตัวอื่นมี 2 · ที่เหลือมี 1',
  'rules.back': 'กลับ',

  'game.round': 'ตาที่ {n} / 10',
  'game.speed2': '×2',
  'game.pause': 'II',
  'game.rowPrompt': 'การ์ด {c} น้อยกว่าทุกแถว — เลือกรับหนึ่งแถว!',
  'game.you': 'คุณ',

  'score.title': 'จบตาแล้ว',
  'score.continue': 'ตาต่อไป →',
  'score.results': 'ผลลัพธ์ →',
  'score.hint': 'คลิกหรือกด space',

  'end.win': 'คุณชนะ!',
  'end.lose': 'แพ้',
  'end.draw': 'เสมอ!',
  'end.rematch': 'เล่นอีกครั้ง',
  'end.menu': 'หน้าหลัก',

  'rotate.rotate': 'หมุนอุปกรณ์เป็นแนวนอน',
};

const dicts: Record<Lang, Record<StringKey, string>> = { en, th };

/** Translate a key with {param} substitution. */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  let s = dicts[getSettings().language][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  }
  return s;
}

const listeners = new Set<() => void>();

/** Re-render callback subscription (screens re-render on language change). */
export function onLanguageChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

onSettingsChange((s) => {
  if (s.language === 'en' || s.language === 'th') {
    for (const fn of listeners) fn();
  }
});
