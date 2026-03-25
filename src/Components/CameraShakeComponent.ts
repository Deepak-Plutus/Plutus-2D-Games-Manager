export type CameraShakeComponentProps = {
  intensity?: number;
  durationMs?: number;
};

/**
 * CameraShakeComponent
 * - Random shake offset for stage pivot.
 */
export class CameraShakeComponent {
  static readonly type = "CameraShakeComponent";
  readonly type = CameraShakeComponent.type;

  private _intensity = 0;
  private _durationMs = 0;
  private _remainingMs = 0;

  constructor(props: CameraShakeComponentProps = {}) {
    const intensity = typeof props.intensity === "number" ? props.intensity : undefined;
    const durationMs = typeof props.durationMs === "number" ? props.durationMs : undefined;
    if (typeof intensity === "number" && typeof durationMs === "number") this.shake(intensity, durationMs);
  }

  shake(intensity: number, durationMs: number): void {
    if (!Number.isFinite(intensity) || intensity <= 0) return;
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    this._intensity = intensity;
    this._durationMs = durationMs;
    this._remainingMs = durationMs;
  }

  updateShake(dtMs: number): { offsetX: number; offsetY: number; active: boolean } {
    if (this._remainingMs <= 0 || this._intensity <= 0) return { offsetX: 0, offsetY: 0, active: false };
    this._remainingMs -= Math.max(0, dtMs);
    const t = Math.max(0, this._remainingMs) / Math.max(1, this._durationMs);
    const amp = this._intensity * t;
    const offsetX = (Math.random() * 2 - 1) * amp;
    const offsetY = (Math.random() * 2 - 1) * amp;
    return { offsetX, offsetY, active: this._remainingMs > 0 };
  }
}

