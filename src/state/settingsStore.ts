/** Reactive settings: one source of truth for UI + renderer + audio. */

import { type Settings, DEFAULT_SETTINGS, loadSettings, saveSettings } from './persistence';

type Listener = (s: Settings) => void;

let current: Settings = loadSettings();
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
