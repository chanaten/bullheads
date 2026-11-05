/**
 * Procedural audio (Q38): chill lo-fi music loop + physical card SFX,
 * synthesized with Web Audio — no assets, no licensing, no network.
 *
 * Everything is created lazily on the first user gesture (autoplay policy)
 * and respects the music/SFX volume settings live.
 */

import { getSettings, onSettingsChange } from '../state/settingsStore';
import type { SfxName } from './names';

const MUSIC_LEVEL = 0.42; // headroom under SFX

/** One chord per bar: Cmaj7 → Am7 → Dm7 → G7 (classic lo-fi loop). */
const CHORDS: number[][] = [
  [261.63, 329.63, 392.0, 493.88],
  [220.0, 261.63, 329.63, 392.0],
  [146.83, 174.61, 220.0, 261.63],
  [196.0, 246.94, 293.66, 349.23],
];
const ROOTS = [130.81, 110.0, 73.42, 98.0];
const BPM = 72;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private nextBarTime = 0;
  private barIndex = 0;
  private musicRunning = false;

  /** Create/resume the context. Safe to call often. */
  ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      try {
        this.ctx = new AC();
      } catch {
        return null;
      }
      const ctx = this.ctx;

      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = getSettings().music * MUSIC_LEVEL;
      this.musicGain.connect(ctx.destination);

      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = getSettings().sfx;
      this.sfxGain.connect(ctx.destination);

      // shared white-noise buffer for SFX + vinyl crackle
      const len = Math.floor(ctx.sampleRate * 2);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

      // singleton lives for the app's lifetime — listener stays registered
      onSettingsChange((s) => {
        this.musicGain?.gain.setTargetAtTime(s.music * MUSIC_LEVEL, ctx.currentTime, 0.05);
        this.sfxGain?.gain.setTargetAtTime(s.sfx, ctx.currentTime, 0.05);
      });

      document.addEventListener('visibilitychange', () => {
        if (!this.musicRunning) return;
        if (document.hidden) void this.ctx?.suspend();
        else void this.ctx?.resume();
      });
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Start the lo-fi loop (idempotent). */
  startMusic(): void {
    const ctx = this.ensure();
    if (!ctx || this.musicRunning) return;
    this.musicRunning = true;
    this.nextBarTime = ctx.currentTime + 0.1;
    this.barIndex = 0;
    this.scheduleCrackle(ctx);
    setInterval(() => this.tick(), 40);
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicRunning) return;
    while (this.nextBarTime < ctx.currentTime + 0.25) {
      this.scheduleBar(ctx, this.nextBarTime, this.barIndex);
      this.nextBarTime += BAR;
      this.barIndex++;
    }
  }

  private scheduleCrackle(ctx: AudioContext): void {
    if (!this.noiseBuf || !this.musicGain) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const g = ctx.createGain();
    g.gain.value = 0.012;
    src.connect(hp).connect(g).connect(this.musicGain);
    src.start();
  }

  private scheduleBar(ctx: AudioContext, t0: number, bar: number): void {
    if (!this.musicGain) return;
    const chord = CHORDS[bar % CHORDS.length];
    const root = ROOTS[bar % ROOTS.length];

    // pads: soft detuned triangles through a muffled lowpass
    for (const [i, freq] of chord.entries()) {
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1300;
        const g = ctx.createGain();
        const peak = 0.05 * (i === 0 ? 1.2 : 1);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(peak, t0 + 0.18);
        g.gain.setTargetAtTime(0.0001, t0 + BAR * 0.85, 0.25);
        osc.connect(lp).connect(g).connect(this.musicGain);
        osc.start(t0);
        osc.stop(t0 + BAR + 1);
      }
    }

    // bass: root on beat 1 and a nudge on beat 3
    for (const [beat, gain] of [
      [0, 0.14],
      [2.5, 0.09],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = root;
      const g = ctx.createGain();
      const bt = t0 + beat * BEAT;
      g.gain.setValueAtTime(0.0001, bt);
      g.gain.exponentialRampToValueAtTime(gain, bt + 0.05);
      g.gain.setTargetAtTime(0.0001, bt + BEAT * 0.8, 0.15);
      osc.connect(g).connect(this.musicGain);
      osc.start(bt);
      osc.stop(bt + BEAT + 0.6);
    }

    // soft kick: beats 1 and 3
    for (const beat of [0, 2]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const bt = t0 + beat * BEAT;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, bt);
      osc.frequency.exponentialRampToValueAtTime(45, bt + 0.1);
      g.gain.setValueAtTime(0.0001, bt);
      g.gain.exponentialRampToValueAtTime(0.18, bt + 0.01);
      g.gain.setTargetAtTime(0.0001, bt + 0.1, 0.06);
      osc.connect(g).connect(this.musicGain);
      osc.start(bt);
      osc.stop(bt + 0.4);
    }

    // brushed hats on offbeats, quiet and slightly lazy
    for (let b = 0; b < 4; b++) {
      const bt = t0 + (b + 0.5) * BEAT;
      this.noiseBurst(ctx, bt, 0.03, 6500, 'highpass', 0.03, this.musicGain);
    }
  }

  // ------------------------------------------------------------ SFX utils

  private noiseBurst(
    ctx: AudioContext,
    t: number,
    dur: number,
    freq: number,
    type: BiquadFilterType,
    gain: number,
    dest: AudioNode,
    sweepTo?: number,
  ): void {
    if (!this.noiseBuf) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.4, dur * 0.3);
    src.connect(f).connect(g).connect(dest);
    src.start(t);
    src.stop(t + dur + 0.3);
  }

  private tone(
    ctx: AudioContext,
    t: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    dest: AudioNode,
    glideTo?: number,
  ): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.5, dur * 0.35);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.3);
  }

  // ------------------------------------------------------------- playback

  play(name: SfxName, opts: { intensity?: number } = {}): void {
    const ctx = this.ensure();
    const dest = this.sfxGain;
    if (!ctx || !dest) return;
    const t = ctx.currentTime + 0.01;

    switch (name) {
      case 'cardSlide':
        this.noiseBurst(ctx, t, 0.16, 500, 'bandpass', 0.22, dest, 1400);
        break;
      case 'cardPlay':
        this.noiseBurst(ctx, t, 0.2, 380, 'bandpass', 0.28, dest, 1600);
        this.tone(ctx, t, 180, 0.1, 'sine', 0.1, dest, 90);
        break;
      case 'cardFlip':
        this.noiseBurst(ctx, t, 0.05, 2200, 'highpass', 0.2, dest);
        this.noiseBurst(ctx, t + 0.07, 0.05, 2600, 'highpass', 0.16, dest);
        break;
      case 'rowTake': {
        const power = Math.min(1, (opts.intensity ?? 3) / 15);
        this.noiseBurst(ctx, t, 0.35, 900, 'lowpass', 0.3 + power * 0.2, dest, 220);
        this.tone(ctx, t, 220 + power * 60, 0.28, 'triangle', 0.16 + power * 0.1, dest, 70);
        break;
      }
      case 'bigPenalty':
        this.tone(ctx, t, 160, 0.5, 'sawtooth', 0.16, dest, 55);
        this.noiseBurst(ctx, t, 0.5, 700, 'lowpass', 0.3, dest, 150);
        break;
      case 'uiClick':
        this.tone(ctx, t, 760, 0.06, 'square', 0.06, dest, 620);
        break;
      case 'uiHover':
        this.tone(ctx, t, 1100, 0.03, 'sine', 0.03, dest);
        break;
      case 'roundStart':
        this.tone(ctx, t, 660, 0.12, 'sine', 0.07, dest);
        this.tone(ctx, t + 0.09, 880, 0.16, 'sine', 0.07, dest);
        break;
      case 'handEnd':
        [523.25, 659.25, 783.99].forEach((f, i) =>
          this.tone(ctx, t + i * 0.09, f, 0.2, 'triangle', 0.08, dest),
        );
        break;
      case 'victory':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone(ctx, t + i * 0.12, f, 0.3, 'triangle', 0.1, dest),
        );
        break;
      case 'defeat':
        [392, 349.23, 293.66, 233.08].forEach((f, i) =>
          this.tone(ctx, t + i * 0.14, f, 0.32, 'triangle', 0.09, dest),
        );
        break;
    }
  }

  /** Diagnostics for tests/UI. */
  state(): { hasContext: boolean; musicRunning: boolean; ctxState: string | null } {
    return {
      hasContext: this.ctx !== null,
      musicRunning: this.musicRunning,
      ctxState: this.ctx?.state ?? null,
    };
  }
}

export const audio = new AudioEngine();

/** Call once on the first user gesture. */
export function initAudio(): void {
  audio.ensure();
  audio.startMusic();
}
