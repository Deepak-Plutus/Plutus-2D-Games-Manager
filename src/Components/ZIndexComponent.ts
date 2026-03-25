export type ZIndexMode = "normal" | "front" | "back";

export class ZIndexComponent {
  static readonly type = "ZIndex";
  readonly type = ZIndexComponent.type;

  private _zIndex: number;
  private _mode: ZIndexMode;

  constructor(init?: Partial<ZIndexComponent> & { zIndex?: number; front?: boolean; back?: boolean }) {
    this._zIndex = typeof (init as any)?.zIndex === "number" ? ((init as any).zIndex as number) : 0;
    if ((init as any)?.front === true) this._mode = "front";
    else if ((init as any)?.back === true) this._mode = "back";
    else this._mode = "normal";
  }

  setZIndex(v: number): void {
    if (!Number.isFinite(v)) return;
    this._zIndex = v;
    this._mode = "normal";
  }

  bringToFront(): void {
    this._mode = "front";
  }

  sendToBack(): void {
    this._mode = "back";
  }

  offset(delta: number): void {
    if (!Number.isFinite(delta)) return;
    this._zIndex += delta;
    this._mode = "normal";
  }

  reset(): void {
    this._zIndex = 0;
    this._mode = "normal";
  }

  isFrontQueued(): boolean {
    return this._mode === "front";
  }

  isBackQueued(): boolean {
    return this._mode === "back";
  }

  // System reads these to resolve front/back into concrete numeric zIndex.
  get zIndex(): number {
    return this._zIndex;
  }

  get mode(): ZIndexMode {
    return this._mode;
  }

  // System sets mode back to normal after it resolves it.
  _setMode(next: ZIndexMode): void {
    this._mode = next;
  }
}

