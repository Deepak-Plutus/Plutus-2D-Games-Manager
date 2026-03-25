import type { SoundDef, SoundKind } from "../../Systems/AudioSystem";

export type AudioSoundComponentProps =
  | {
      soundId: string;
      kind?: SoundKind;
      type: "tone";
      freq: number;
      durationMs?: number;
      volume?: number;
      autoplay?: boolean;
    }
  | {
      soundId: string;
      kind?: SoundKind;
      type: "url";
      url: string;
      loop?: boolean;
      volume?: number;
      autoplay?: boolean;
    };

export class AudioSoundComponent {
  static readonly type = "AudioSound";
  readonly type = AudioSoundComponent.type;

  soundId: string;
  kind?: SoundKind;
  soundType: "tone" | "url";

  // tone
  freq?: number;
  durationMs?: number;
  // url
  url?: string;
  loop?: boolean;

  volume?: number;
  autoplay: boolean;

  // runtime
  _registered = false;
  _autoplayStarted = false;
  _requestPlay = false;
  _requestStop = false;

  constructor(props: AudioSoundComponentProps) {
    this.soundId = props.soundId;
    this.kind = props.kind;
    this.soundType = props.type;
    this.volume = props.volume;
    this.autoplay = props.autoplay ?? false;

    if (props.type === "tone") {
      this.freq = props.freq;
      this.durationMs = props.durationMs;
    } else {
      this.url = props.url;
      this.loop = props.loop ?? false;
    }
  }

  toSoundDef(): SoundDef | undefined {
    if (!this.soundId) return undefined;
    if (this.soundType === "tone") {
      if (typeof this.freq !== "number") return undefined;
      return {
        id: this.soundId,
        kind: this.kind,
        type: "tone",
        freq: this.freq,
        durationMs: this.durationMs,
        volume: this.volume,
      };
    }
    if (this.soundType === "url") {
      if (typeof this.url !== "string") return undefined;
      return {
        id: this.soundId,
        kind: this.kind,
        type: "url",
        url: this.url,
        loop: this.loop,
        volume: this.volume,
      };
    }
    return undefined;
  }

  play(): void {
    this._requestPlay = true;
  }

  stop(): void {
    this._requestStop = true;
  }

  setVolume(v: number): void {
    if (!Number.isFinite(v)) return;
    this.volume = Math.max(0, Math.min(1, v));
  }

  hasPendingPlay(): boolean {
    return this._requestPlay;
  }

  hasPendingStop(): boolean {
    return this._requestStop;
  }

  consumePlayRequest(): boolean {
    const v = this._requestPlay;
    this._requestPlay = false;
    return v;
  }

  consumeStopRequest(): boolean {
    const v = this._requestStop;
    this._requestStop = false;
    return v;
  }

  clearRequests(): void {
    this._requestPlay = false;
    this._requestStop = false;
  }
}

