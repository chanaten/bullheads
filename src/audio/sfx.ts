/** Sound effects seam — delegates to the procedural audio engine. */

import { audio } from './engine';
import type { SfxName } from './names';

export type { SfxName };

export function play(name: SfxName, opts?: { intensity?: number }): void {
  audio.play(name, opts);
}
