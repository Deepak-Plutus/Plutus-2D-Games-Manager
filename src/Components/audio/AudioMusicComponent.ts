import type { SoundDef, SoundKind } from "../../Systems/AudioSystem";

export type AudioMusicComponentProps =
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

export class AudioMusicComponent {
  static readonly type = "AudioMusic";
  readonly type = AudioMusicComponent.type;

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
  _playingUrl = false;
  _requestPlay = false;
  _requestPause = false;
  _requestStop = false;

  constructor(props: AudioMusicComponentProps) {
    this.soundId = props.soundId;
    this.kind = props.kind;
    this.soundType = props.type;
    this.volume = props.volume;
    this.autoplay = props.autoplay ?? true;

    if (props.type === "tone") {
      this.freq = props.freq;
      this.durationMs = props.durationMs;
    } else {
      this.url = props.url;
      this.loop = props.loop ?? true;
    }
  }

  toSoundDef(): SoundDef | undefined {
    if (!this.soundId) return undefined;
    if (this.soundType === "tone") {
      if (typeof this.freq !== "number") return undefined;
      return {
        id: this.soundId,
        kind: this.kind ?? "music",
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
        kind: this.kind ?? "music",
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
    this._requestPause = false;
    this._requestStop = false;
  }

  pause(): void {
    this._requestPause = true;
    this._requestPlay = false;
  }

  stop(): void {
    this._requestStop = true;
    this._requestPlay = false;
    this._requestPause = false;
  }

  setVolume(v: number): void {
    if (!Number.isFinite(v)) return;
    this.volume = Math.max(0, Math.min(1, v));
  }

  setLoop(v: boolean): void {
    this.loop = !!v;
  }

  hasPendingPlay(): boolean {
    return this._requestPlay;
  }

  hasPendingPause(): boolean {
    return this._requestPause;
  }

  hasPendingStop(): boolean {
    return this._requestStop;
  }

  consumePlayRequest(): boolean {
    const v = this._requestPlay;
    this._requestPlay = false;
    return v;
  }

  consumePauseRequest(): boolean {
    const v = this._requestPause;
    this._requestPause = false;
    return v;
  }

  consumeStopRequest(): boolean {
    const v = this._requestStop;
    this._requestStop = false;
    return v;
  }

  clearRequests(): void {
    this._requestPlay = false;
    this._requestPause = false;
    this._requestStop = false;
  }
}

