/**
 * Sound effects seam. The audio milestone fills these in with lo-fi + card
 * SFX (Q38); until then everything is a silent no-op so the renderer can
 * call sites freely.
 */

export type SfxName =
  | 'cardFlip'
  | 'cardPlay'
  | 'cardSlide'
  | 'rowTake'
  | 'bigPenalty'
  | 'uiClick'
  | 'uiHover'
  | 'roundStart'
  | 'handEnd'
  | 'victory'
  | 'defeat';

export function play(_name: SfxName, _opts?: { intensity?: number }): void {
  // silent until the audio milestone
}
