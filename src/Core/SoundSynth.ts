export type ToneStep = {
  frequency: number;
  delaySec: number;
  durationSec: number;
  oscillator: OscillatorType;
  volume?: number;
};

/**
 * Singleton WebAudio tone synthesizer used by game systems.
 */
export class SoundSynth {
  private static _instance: SoundSynth | null = null;
  private _audioCtx: AudioContext | null = null;
  private _audioReady = false;
  private _masterVolume = 0.08;

  /**
   * Returns shared synthesizer instance.
   *
   * @returns {SoundSynth} Shared synthesizer instance.
   */
  static getInstance(): SoundSynth {
    if (!SoundSynth._instance) SoundSynth._instance = new SoundSynth();
    return SoundSynth._instance;
  }

  private constructor() {}

  /**
   * Sets master output volume in [0,1].
   *
   * @param {number} volume Master volume.
   * @returns {void} Nothing.
   */
  setMasterVolume(volume: number): void {
    this._masterVolume = Math.max(0, Math.min(1, Number(volume) || 0.08));
  }

  /**
   * Creates/resumes audio context to satisfy browser gesture restrictions.
   *
   * @returns {void} Nothing.
   */
  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this._audioCtx) {
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this._audioCtx = new Ctx();
    }
    if (this._audioCtx.state === 'suspended') void this._audioCtx.resume();
    this._audioReady = this._audioCtx.state === 'running';
  }

  /**
   * Plays a short sequence of oscillator tones.
   *
   * @param {ToneStep[]} steps Tone sequence.
   * @param {{ masterVolume?: number } | undefined} options Playback options.
   * @returns {void} Nothing.
   */
  playSequence(steps: ToneStep[], options?: { masterVolume?: number }): void {
    this.unlock();
    if (!this._audioCtx || !this._audioReady) return;
    if (!steps.length) return;

    const ctx = this._audioCtx;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const gain = options?.masterVolume == null ? this._masterVolume : Math.max(0, Math.min(1, Number(options.masterVolume) || this._masterVolume));
    master.gain.setValueAtTime(gain, now);
    master.connect(ctx.destination);

    for (const step of steps) {
      const start = now + step.delaySec;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = step.oscillator;
      o.frequency.setValueAtTime(step.frequency, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(step.volume ?? 0.35, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + step.durationSec);
      o.connect(g);
      g.connect(master);
      o.start(start);
      o.stop(start + step.durationSec + 0.02);
    }
  }
}
