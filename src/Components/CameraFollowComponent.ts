export type CameraFollowComponentProps = {
  target?: string;
  lerpSpeed?: number;
};

/**
 * CameraFollowComponent
 * - JSON-driven follow target by entity name.
 * - Produces smooth camera motion via lerp.
 */
export class CameraFollowComponent {
  static readonly type = "CameraFollowComponent";
  readonly type = CameraFollowComponent.type;

  private _target?: string;
  private _lerpSpeed: number;

  constructor(props: CameraFollowComponentProps = {}) {
    this._target = typeof props.target === "string" ? props.target : undefined;
    this._lerpSpeed = typeof props.lerpSpeed === "number" ? props.lerpSpeed : 6;
  }

  setTarget(entityName: string): void {
    if (typeof entityName !== "string" || entityName.length === 0) return;
    this._target = entityName;
  }

  setLerpSpeed(v: number): void {
    if (!Number.isFinite(v) || v < 0) return;
    this._lerpSpeed = v;
  }

  get target(): string | undefined {
    return this._target;
  }

  get lerpSpeed(): number {
    return this._lerpSpeed;
  }

  /**
   * updateFollow(dt)
   * - Computes a new position by interpolating current -> target.
   * - dt is in ms.
   */
  updateFollow(dtMs: number, currentX: number, currentY: number, targetX: number, targetY: number): {
    x: number;
    y: number;
  } {
    const dtSec = Math.max(0, dtMs) / 1000;
    const k = this._lerpSpeed;
    const t = Math.max(0, Math.min(1, k * dtSec));
    return {
      x: currentX + (targetX - currentX) * t,
      y: currentY + (targetY - currentY) * t,
    };
  }
}

