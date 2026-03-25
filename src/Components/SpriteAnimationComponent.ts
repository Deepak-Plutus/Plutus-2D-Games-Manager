export type SpriteAnimationComponentProps = {
  frames: string[];
  fps?: number;
  loop?: boolean;
  playing?: boolean;
};

export class SpriteAnimationComponent {
  static readonly type = 'SpriteAnimation';
  readonly type = SpriteAnimationComponent.type;

  frames: string[];
  fps: number;
  loop: boolean;
  playing: boolean;
  currentFrame: number;
  currentAnimation: string;

  // runtime
  _accumMs = 0;

  constructor(props: SpriteAnimationComponentProps) {
    this.frames = props.frames;
    this.fps = typeof props.fps === 'number' ? props.fps : 12;
    this.loop = typeof props.loop === 'boolean' ? props.loop : true;
    this.playing = typeof props.playing === 'boolean' ? props.playing : true;
    this.currentFrame = 0;
    this.currentAnimation = 'default';
  }

  play(name?: string): void {
    if (typeof name === 'string' && name.length) this.currentAnimation = name;
    this.playing = true;
  }

  pause(): void {
    this.playing = false;
  }

  stop(): void {
    this.playing = false;
    this.currentFrame = 0;
    this._accumMs = 0;
  }

  setFrame(frame: number): void {
    if (!Number.isFinite(frame) || this.frames.length <= 0) return;
    const max = this.frames.length - 1;
    const next = Math.max(0, Math.min(max, Math.floor(frame)));
    this.currentFrame = next;
  }

  setFps(fps: number): void {
    if (!Number.isFinite(fps)) return;
    this.fps = Math.max(0, fps);
  }

  setLoop(loop: boolean): void {
    this.loop = !!loop;
  }

  restart(): void {
    this.currentFrame = 0;
    this._accumMs = 0;
    this.playing = true;
  }

  isFinished(): boolean {
    if (this.frames.length <= 0) return true;
    if (this.loop) return false;
    return !this.playing && this.currentFrame >= this.frames.length - 1;
  }

  update(dtMs: number): void {
    if (!this.playing || this.frames.length <= 0 || this.fps <= 0) return;
    const frameMs = 1000 / this.fps;
    this._accumMs += Math.max(0, dtMs);
    while (this._accumMs >= frameMs) {
      this._accumMs -= frameMs;
      if (this.currentFrame < this.frames.length - 1) {
        this.currentFrame += 1;
      } else if (this.loop) {
        this.currentFrame = 0;
      } else {
        this.playing = false;
        break;
      }
    }
  }
}

