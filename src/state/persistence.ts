/** Local persistence: match saves (resume) and settings. No accounts, no cloud. */

import type { MatchState } from '../engine/rules';

const MATCH_KEY = 'bullheads.match.v1';
const SETTINGS_KEY = 'bullheads.settings.v1';

export interface SavedMatch {
  version: 1;
  state: MatchState;
  savedAt: number;
}

export interface Settings {
  language: 'en' | 'th';
  /** 0..1 */
  music: number;
  /** 0..1 */
  sfx: number;
  /** 1 or 2 — the ×2 speed toggle. */
  speed: 1 | 2;
  motion: 'full' | 'reduced';
  tutorialSeen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  music: 0.5,
  sfx: 0.7,
  speed: 1,
  motion: 'full',
  tutorialSeen: false,
};

function isMatchState(v: unknown): v is MatchState {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Partial<MatchState>;
  return (
    Array.isArray(s.players) &&
    s.players.length === 5 &&
    s.players.every(
      (p) =>
        typeof p.id === 'number' &&
        Array.isArray(p.hand) &&
        typeof p.score === 'number' &&
        Array.isArray(p.takenCards),
    ) &&
    Array.isArray(s.rows) &&
    s.rows.length === 4 &&
    typeof s.round === 'number'
  );
}

export function saveMatch(state: MatchState): void {
  try {
    const payload: SavedMatch = { version: 1, state, savedAt: Date.now() };
    localStorage.setItem(MATCH_KEY, JSON.stringify(payload));
  } catch {
    // storage full/blocked — resume simply won't be offered
  }
}

/** Returns a validated saved match, or null (missing/corrupt/old). */
export function loadMatch(): SavedMatch | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedMatch;
    if (parsed.version !== 1 || !isMatchState(parsed.state)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMatch(): void {
  try {
    localStorage.removeItem(MATCH_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      speed: parsed.speed === 2 ? 2 : 1,
      motion: parsed.motion === 'reduced' ? 'reduced' : 'full',
      language: parsed.language === 'th' ? 'th' : 'en',
      tutorialSeen: Boolean(parsed.tutorialSeen),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
