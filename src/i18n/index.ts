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
  'score.peekHint': 'release Tab to hide',

  'end.win': 'YOU WIN!',
  'end.lose': 'DEFEAT',
  'end.draw': 'DRAW!',
  'end.rematch': 'REMATCH',
  'end.menu': 'MAIN MENU',

  'rotate.rotate': 'Rotate your device to landscape',

  'tut.step1.title': 'YOUR FIRST CARD',
  'tut.step1.body':
    'Every round, everyone plays one card at once — lowest first. A card lands on the row whose LAST card is the nearest lower number. Play the glowing 65!',
  'tut.land.title': 'NEAREST LOWER WINS',
  'tut.land.body':
    'Your 65 landed on the row ending in 50 — the nearest lower number, not the row ending in 11. The row grew one card.',
  'tut.step2.title': 'SMALL CARDS TOO',
  'tut.step2.body': 'Play the glowing 13. Small cards are safe as long as they find a row to land on.',
  'tut.fill.title': 'ROWS FILL UP',
  'tut.fill.body':
    'A row holds 5 cards. This one now has 4 — the next card landing there will be the 6th, and that player must take the whole row!',
  'tut.step3.title': 'TRIGGER THE TAKE',
  'tut.step3.body': 'Play the glowing 15 to fill the row. Watch what the next card does…',
  'tut.take.title': 'SIX CARDS = TAKE IT!',
  'tut.take.body':
    'The 6th card makes its player TAKE the whole row — every bullhead becomes their penalty. Nyx just picked up 10 points!',
  'tut.step4.title': 'LOWER THAN EVERYTHING',
  'tut.step4.body':
    'Play the glowing 4. It is lower than every row on the table — you will have to choose a row to take.',
  'tut.done.title': 'FORCED CHOICE',
  'tut.done.body':
    'When your card beats every row, you must take one — usually the one with the fewest bullheads. Your card then starts that row again.',
  'tut.finish.title': 'YOU ARE READY!',
  'tut.finish.body':
    'That is the whole game: dodge bullheads, bait others into takes, and finish with the fewest points. Good luck!',
  'tut.next': 'NEXT',
  'tut.skip': 'SKIP',
  'tut.finish': 'DONE',
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
  'score.peekHint': 'ปล่อย Tab เพื่อซ่อน',

  'end.win': 'คุณชนะ!',
  'end.lose': 'แพ้',
  'end.draw': 'เสมอ!',
  'end.rematch': 'เล่นอีกครั้ง',
  'end.menu': 'หน้าหลัก',

  'rotate.rotate': 'หมุนอุปกรณ์เป็นแนวนอน',

  'tut.step1.title': 'ไพ่ใบแรกของคุณ',
  'tut.step1.body':
    'ทุกตาทุกคนวางไพ่พร้อมกัน — จากน้อยไปมาก ไพ่จะลงแถวที่เลขท้ายใกล้เคียงน้อยกว่าที่สุด เล่นไพ่ 65 ที่เรืองแสงเลย!',
  'tut.land.title': 'ใกล้กว่าเท่านั้น',
  'tut.land.body':
    'ไพ่ 65 ของคุณลงแถวที่จบด้วย 50 — ใกล้เคียงที่สุด ไม่ใช่แถวที่จบด้วย 11 แถวใหญ่ขึ้นหนึ่งใบ',
  'tut.step2.title': 'ไพ่เล็กก็สำคัญ',
  'tut.step2.body': 'เล่นไพ่ 13 ที่เรืองแสง ไพ่เล็กปลอดภัยเสมอเมื่อมีแถวให้ลง',
  'tut.fill.title': 'แถวเริ่มเต็ม',
  'tut.fill.body':
    'แถวหนึ่งมีได้ 5 ใบ ตอนนี้เหลือ4 — ไพ่ถัดไปที่ลงแถวนี้จะเป็นใบที่ 6 และผู้เล่นนั้นต้องรับไพ่ทั้งแถว!',
  'tut.step3.title': 'จุดชนวนการรับไพ่',
  'tut.step3.body': 'เล่นไพ่ 15 เพื่อเติมแถว ดูว่าไพ่ใบถัดไปจะเกิดอะไรขึ้น…',
  'tut.take.title': 'หกใบ = รับเลย!',
  'tut.take.body':
    'ไพ่ใบที่ 6 ทำให้ผู้เล่นนั้นรับไพ่ทั้งแถว — หัวกระทิงทุกหัวกลายเป็นคะแนนโทษของพวกเขา ไนซ์เพิ่งรับไป10 แต้ม!',
  'tut.step4.title': 'น้อยกว่าทุกแถว',
  'tut.step4.body':
    'เล่นไพ่ 4 ที่เรืองแสง มันน้อยกว่าทุกแถวบนโต๊ะ — คุณจะต้องเลือกรับหนึ่งแถว',
  'tut.done.title': 'บังคับเลือกแถว',
  'tut.done.body':
    'เมื่อการ์ดของคุณน้อยกว่าทุกแถว คุณต้องรับหนึ่งแถว — มักเลือกแถวที่หัวกระทิงน้อยที่สุด แล้วการ์ดของคุณจะเริ่มแถวนั้นใหม่',
  'tut.finish.title': 'พร้อมแล้ว!',
  'tut.finish.body':
    'นี่คือทั้งเกม: หลบหัวกระทิง หลอกให้คนอื่นรับไพ่ และจบด้วยคะแนนน้อยที่สุด ขอให้โชคดี!',
  'tut.next': 'ถัดไป',
  'tut.skip': 'ข้าม',
  'tut.finish': 'เสร็จสิ้น',
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
