/** Pilot callsign pool: 4 dealt randomly from 30 every match. */

import { shuffle } from './cards';

export const ROSTER: readonly string[] = [
  // previously approved
  'Nyx', 'Flux', 'Rook', 'Kira',
  'Zhang', 'Yugi', 'Sanjay', 'Priya',
  // new callsigns
  'Vex', 'Jett', 'Nova', 'Blaze', 'Onyx', 'Frost', 'Dusk', 'Echo',
  'Rift', 'Volt', 'Zero', 'Quark', 'Orbit', 'Comet', 'Astro', 'Drift',
  'Titan', 'Loki', 'Surge', 'Ember', 'Wisp', 'Cipher',
];

if (ROSTER.length !== 30) {
  throw new Error(`roster must hold 30 names, got ${ROSTER.length}`);
}

/** Four distinct callsigns, randomly sampled for one match. */
export function sampleRoster(rng: () => number = Math.random): string[] {
  return shuffle(ROSTER, rng).slice(0, 4);
}
