/** Reactive settings: one source of truth for UI + renderer + audio. */

import { type Settings, DEFAULT_SETTINGS, loadSettings, saveSettings } from './persistence';

type Listener = (s: Settings) => void;

let hadSaved = false;
try {
  hadSaved = localStorage.getItem('hyperstrike.settings.v1') !== null;
} catch {
  hadSaved = false;
}

let current: Settings = loadSettings();

// First run on a system that asks for reduced motion starts that way (Q28).
if (
  !hadSaved &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  current = { ...current, motion: 'reduced' };
}

const listeners = new Set<Listener>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  saveSettings(current);
  for (const fn of listeners) fn(current);
}

export function onSettingsChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Test helper: reset to defaults without touching storage. */
export function resetSettingsForTests(): void {
  current = { ...DEFAULT_SETTINGS };
  listeners.clear();
}
