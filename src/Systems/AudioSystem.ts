import { System } from '../Core/System';
import type { World } from '../Core/World';
import type { GameDefinition } from '../Definitions/GameDefinition';
import type { InputState } from './InputSystem';
import { RES_INPUT } from './InputSystem';
import { RES_GAME_DEF } from './LoadingSystem';

export type SoundKind = 'sfx' | 'music';
export type SoundType = 'tone' | 'url';

export type SoundDef =
  | {
      id: string;
      kind?: SoundKind;
      type: 'tone';
      freq: number;
      durationMs?: number;
      volume?: number; // 0..1
    }
  | {
      id: string;
      kind?: SoundKind;
      type: 'url';
      url: string;
      loop?: boolean;
      volume?: number; // 0..1
    };

export type AudioConfig = {
  masterVolume?: number; // 0..1
  sfxVolume?: number; // 0..1
  musicVolume?: number; // 0..1
  sounds?: SoundDef[];
};

export type AudioState = {
  unlocked: boolean;
  muted: boolean;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
};

export const RES_AUDIO = 'audio';
export const RES_AUDIO_API = 'audio_api';

export type AudioApi = {
  play: (soundId: string) => void;
  pause: (soundId?: string) => void;
  stop: (soundId?: string) => void;
  getVolume: (kind?: SoundKind | 'master') => number;
  setVolume: (value: number, kind?: SoundKind | 'master') => void;
  setMuted: (value: boolean) => void;
  toggleMuted: () => boolean;
  registerSound: (def: SoundDef) => void;
  changeSound: (soundId: string, next: Partial<SoundDef>) => void;
};

/**
 * AudioSystem
 * - Supports procedural "tone" sounds (great for early prototyping + AI-generated JSON).
 * - Supports URL sounds via HTMLAudioElement (no extra libs).
 * - Uses a world resource so other systems can request playback later.
 */
export class AudioSystem extends System {
  private ctx?: AudioContext;
  private configLoaded = false;
  private worldRef?: World;

  private sounds = new Map<string, SoundDef>();
  private urlAudio = new Map<string, HTMLAudioElement>();

  get singletonKey(): string {
    return 'AudioSystem';
  }

  update(_dt: number, world: World): void {
    this.worldRef = world;

    let state = world.getResource<AudioState>(RES_AUDIO);
    if (!state) {
      state = {
        unlocked: false,
        muted: false,
        masterVolume: 0.8,
        sfxVolume: 1,
        musicVolume: 0.6,
      };
      world.setResource(RES_AUDIO, state);
    }

    if (!this.configLoaded) {
      const def = world.getResource<GameDefinition>(RES_GAME_DEF);
      this.loadConfig(def?.world?.audio as AudioConfig | undefined, state);
      this.configLoaded = true;
    }

    if (!world.getResource<AudioApi>(RES_AUDIO_API)) {
      world.setResource(RES_AUDIO_API, {
        play: (soundId: string) => this.play(soundId),
        pause: (soundId?: string) => this.pause(soundId),
        stop: (soundId?: string) => this.stop(soundId),
        getVolume: (kind?: SoundKind | 'master') => this.getVolume(kind),
        setVolume: (value: number, kind?: SoundKind | 'master') => this.setVolume(value, kind),
        setMuted: (value: boolean) => this.setMuted(value),
        toggleMuted: () => this.toggleMuted(),
        registerSound: (def: SoundDef) => this.registerSound(def),
        changeSound: (soundId: string, next: Partial<SoundDef>) => this.changeSound(soundId, next),
      });
    }

    // Browser audio unlock (requires user gesture)
    if (!state.unlocked) this.tryUnlockOnGesture(state);

    // Demo trigger: Space plays "blip" if present, otherwise a default tone.
    const input = world.getResource<InputState>(RES_INPUT);
    if (input?.justPressed.has('Space')) {
      this.play('blip');
    }

    // Demo trigger: M toggles mute.
    if (input?.justPressed.has('KeyM')) {
      this.setMuted(!state.muted);
    }
  }

  play(soundId: string): void {
    const world = this.worldRef;
    if (!world) return;
    const state = world.getResource<AudioState>(RES_AUDIO);
    if (!state || state.muted) return;

    const def = this.sounds.get(soundId);
    if (!def) {
      // fallback tone so there is always audible feedback during prototyping
      this.playTone(660, 90, 0.15 * state.masterVolume * state.sfxVolume);
      return;
    }

    const kind: SoundKind = def.kind ?? 'sfx';
    const kindVol = kind === 'music' ? state.musicVolume : state.sfxVolume;
    const vol = clamp01((def.volume ?? 1) * state.masterVolume * kindVol);

    if (def.type === 'tone') {
      this.playTone(def.freq, def.durationMs ?? 90, vol);
      return;
    }

    // url
    const a = this.getOrCreateHtmlAudio(soundId, def.url, def.loop ?? false);
    a.volume = vol;
    a.muted = state.muted;
    a.currentTime = 0;
    void a.play().catch(() => {
      // ignore autoplay rejections until unlocked
    });
  }

  pause(soundId?: string): void {
    if (soundId) {
      this.urlAudio.get(soundId)?.pause();
      return;
    }
    for (const a of this.urlAudio.values()) a.pause();
  }

  stop(soundId?: string): void {
    if (soundId) {
      const a = this.urlAudio.get(soundId);
      if (!a) return;
      a.pause();
      a.currentTime = 0;
      return;
    }
    for (const a of this.urlAudio.values()) {
      a.pause();
      a.currentTime = 0;
    }
  }

  getVolume(kind: SoundKind | 'master' = 'master'): number {
    const world = this.worldRef;
    const state = world?.getResource<AudioState>(RES_AUDIO);
    if (!state) return 0;
    if (kind === 'master') return state.masterVolume;
    if (kind === 'music') return state.musicVolume;
    return state.sfxVolume;
  }

  setVolume(value: number, kind: SoundKind | 'master' = 'master'): void {
    const world = this.worldRef;
    const state = world?.getResource<AudioState>(RES_AUDIO);
    if (!state) return;
    const v = clamp01(value);
    if (kind === 'master') state.masterVolume = v;
    else if (kind === 'music') state.musicVolume = v;
    else state.sfxVolume = v;

    // Update playing URL sounds with new effective volume
    for (const [id, a] of this.urlAudio.entries()) {
      const def = this.sounds.get(id);
      if (!def) continue;
      const kindDef: SoundKind = def.kind ?? 'sfx';
      const kindVol = kindDef === 'music' ? state.musicVolume : state.sfxVolume;
      a.volume = clamp01((def.volume ?? 1) * state.masterVolume * kindVol);
    }
  }

  setMuted(value: boolean): void {
    const world = this.worldRef;
    const state = world?.getResource<AudioState>(RES_AUDIO);
    if (!state) return;
    state.muted = value;
    for (const a of this.urlAudio.values()) a.muted = value;
  }

  toggleMuted(): boolean {
    const world = this.worldRef;
    const state = world?.getResource<AudioState>(RES_AUDIO);
    if (!state) return false;
    this.setMuted(!state.muted);
    return state.muted;
  }

  registerSound(def: SoundDef): void {
    if (!def?.id) return;
    this.sounds.set(def.id, def);
  }

  changeSound(soundId: string, next: Partial<SoundDef>): void {
    const curr = this.sounds.get(soundId);
    if (!curr) return;
    const merged = { ...curr, ...next } as SoundDef;
    this.sounds.set(soundId, merged);
    if (merged.type === 'url') {
      const existing = this.urlAudio.get(soundId);
      if (existing && merged.url) {
        existing.src = merged.url;
        existing.loop = merged.loop ?? false;
      }
    }
  }

  private loadConfig(config: AudioConfig | undefined, state: AudioState): void {
    if (!config) {
      // Provide a default procedural sound so the system is useful immediately.
      this.sounds.set('blip', { id: 'blip', type: 'tone', kind: 'sfx', freq: 880, durationMs: 80, volume: 1 });
      return;
    }

    if (typeof config.masterVolume === 'number') state.masterVolume = clamp01(config.masterVolume);
    if (typeof config.sfxVolume === 'number') state.sfxVolume = clamp01(config.sfxVolume);
    if (typeof config.musicVolume === 'number') state.musicVolume = clamp01(config.musicVolume);

    for (const s of config.sounds ?? []) {
      if (!s?.id) continue;
      this.sounds.set(s.id, s);
    }

    if (!this.sounds.has('blip')) {
      this.sounds.set('blip', { id: 'blip', type: 'tone', kind: 'sfx', freq: 880, durationMs: 80, volume: 1 });
    }
  }

  private tryUnlockOnGesture(state: AudioState): void {
    const unlock = () => {
      // WebAudio
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});

      // HTMLAudio
      for (const a of this.urlAudio.values()) {
        a.muted = state.muted;
      }

      state.unlocked = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };

    // Attach once; if already attached, this is cheap (duplicate adds are ignored by browser)
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  private playTone(freq: number, durationMs: number, volume: number): void {
    if (!this.ctx) return;
    if (this.ctx.state !== 'running') return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = Math.max(20, freq);

    const t0 = ctx.currentTime;
    const t1 = t0 + Math.max(0.01, durationMs / 1000);

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t1 + 0.02);
  }

  private getOrCreateHtmlAudio(id: string, url: string, loop: boolean): HTMLAudioElement {
    let a = this.urlAudio.get(id);
    if (!a) {
      a = new Audio(url);
      a.preload = 'auto';
      a.loop = loop;
      this.urlAudio.set(id, a);
    } else {
      a.loop = loop;
    }
    return a;
  }
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

