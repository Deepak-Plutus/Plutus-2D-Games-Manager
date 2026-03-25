export type CameraFollowAxis = 'x' | 'y' | 'xy';
export type CameraFollowTarget = { type: 'entity' | 'group'; id: string; axis?: CameraFollowAxis };

export type CameraComponentProps = {
  mode?: 'fixed' | 'follow';
  zoom?: number;
  follow_entity_id?: string; // by entity.name
  followTarget?: CameraFollowTarget;
  followAxis?: CameraFollowAxis;
  followOffsetX?: number;
  followOffsetY?: number;
  follow_right_only?: boolean;
  lock_y?: boolean;
  y?: number;
  fixed_x?: number;
  fixed_y?: number;
  bounds?: [number, number, number, number]; // [x,y,w,h]
  shake?: { intensity: number; durationMs: number };
};

export class CameraComponent {
  static readonly type = 'Camera';
  readonly type = CameraComponent.type;

  mode: 'fixed' | 'follow';
  zoom: number;
  follow_entity_id?: string;
  followTarget?: CameraFollowTarget;
  followAxis: CameraFollowAxis;
  followOffsetX: number;
  followOffsetY: number;
  follow_right_only: boolean;
  lock_y: boolean;
  y?: number;
  fixed_x?: number;
  fixed_y?: number;
  bounds?: [number, number, number, number];

  // runtime shake state
  private _shakeIntensity = 0;
  private _shakeDurationMs = 0;
  private _shakeRemainingMs = 0;

  constructor(props: CameraComponentProps = {}) {
    this.mode = props.mode ?? 'follow';
    this.zoom = typeof props.zoom === 'number' && props.zoom > 0 ? props.zoom : 2;
    this.follow_entity_id = typeof props.follow_entity_id === 'string' ? props.follow_entity_id : undefined;
    this.followTarget = props.followTarget;
    this.followAxis = props.followAxis ?? props.followTarget?.axis ?? 'xy';
    this.followOffsetX = Number.isFinite(props.followOffsetX) ? (props.followOffsetX as number) : 0;
    this.followOffsetY = Number.isFinite(props.followOffsetY) ? (props.followOffsetY as number) : 0;
    this.follow_right_only = props.follow_right_only ?? true;
    this.lock_y = props.lock_y ?? true;
    this.y = typeof props.y === 'number' ? props.y : undefined;
    this.fixed_x = typeof props.fixed_x === 'number' ? props.fixed_x : undefined;
    this.fixed_y = typeof props.fixed_y === 'number' ? props.fixed_y : undefined;
    this.bounds = props.bounds;

    // Optional initial shake configuration (mostly for JSON-driven setup).
    const shake = (props as any).shake;
    if (shake && typeof shake.intensity === 'number' && typeof shake.durationMs === 'number') {
      this._shakeIntensity = Math.max(0, shake.intensity);
      this._shakeDurationMs = Math.max(0, shake.durationMs);
      this._shakeRemainingMs = this._shakeDurationMs;
    }
  }

  setPosition(x: number, y: number): void {
    // "fixed" and "follow" both rely on stage pivot; we use fixed coords for deterministic positioning.
    this.fixed_x = x;
    this.fixed_y = y;
    this.mode = "fixed";
  }

  setMode(mode: 'fixed' | 'follow'): void {
    this.mode = mode;
  }

  follow(entityName: string): void {
    this.mode = "follow";
    this.follow_entity_id = entityName;
  }

  clearFollowTarget(): void {
    this.follow_entity_id = undefined;
    this.followTarget = undefined;
  }

  setFollowTarget(target?: CameraFollowTarget): void {
    this.followTarget = target;
    if (target?.axis) this.followAxis = target.axis;
  }

  setFollowAxis(axis: CameraFollowAxis): void {
    this.followAxis = axis;
  }

  setZoom(z: number): void {
    if (!Number.isFinite(z) || z <= 0) return;
    this.zoom = z;
  }

  setBounds(bounds?: [number, number, number, number]): void {
    this.bounds = bounds;
  }

  shake(intensity: number, durationMs: number): void {
    if (!Number.isFinite(intensity) || intensity <= 0) return;
    if (!Number.isFinite(durationMs) || durationMs <= 0) return;
    this._shakeIntensity = intensity;
    this._shakeDurationMs = durationMs;
    this._shakeRemainingMs = durationMs;
  }

  stopShake(): void {
    this._shakeRemainingMs = 0;
  }

  isShaking(): boolean {
    return this._shakeRemainingMs > 0 && this._shakeIntensity > 0;
  }

  setFollowOffset(x: number, y: number): void {
    if (Number.isFinite(x)) this.followOffsetX = x;
    if (Number.isFinite(y)) this.followOffsetY = y;
  }

  /**
   * Called by camera systems to update shake and compute current offset.
   */
  _tickShake(dtMs: number): { offsetX: number; offsetY: number; active: boolean } {
    if (this._shakeRemainingMs <= 0 || this._shakeIntensity <= 0) return { offsetX: 0, offsetY: 0, active: false };
    this._shakeRemainingMs -= Math.max(0, dtMs);
    const t = Math.max(0, this._shakeRemainingMs) / Math.max(1, this._shakeDurationMs);
    const amp = this._shakeIntensity * t;
    const offsetX = (Math.random() * 2 - 1) * amp;
    const offsetY = (Math.random() * 2 - 1) * amp;
    const active = this._shakeRemainingMs > 0;
    return { offsetX, offsetY, active };
  }
}

