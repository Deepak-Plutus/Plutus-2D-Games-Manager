import type { Vec2 } from "./TransformComponent";

export type WanderComponentProps = {
  radius?: number;
  speed?: number;
  changeIntervalMs?: number;
};

export class WanderComponent {
  static readonly type = "Wander";
  readonly type = WanderComponent.type;

  radius: number;
  speed: number;
  changeIntervalMs: number;

  // runtime
  _origin?: Vec2;
  _dir: Vec2 = { x: 1, y: 0 };
  _timeUntilPickMs = 0;

  constructor(props: WanderComponentProps = {}) {
    this.radius = typeof props.radius === "number" ? Math.max(0, props.radius) : 120;
    this.speed = typeof props.speed === "number" ? Math.max(0, props.speed) : 80;
    this.changeIntervalMs = typeof props.changeIntervalMs === "number" ? Math.max(1, props.changeIntervalMs) : 900;
    this._timeUntilPickMs = this.changeIntervalMs;
  }

  setRadius(r: number): void {
    if (!Number.isFinite(r)) return;
    this.radius = Math.max(0, r);
  }

  setSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return;
    this.speed = Math.max(0, speed);
  }

  setChangeInterval(ms: number): void {
    if (!Number.isFinite(ms)) return;
    this.changeIntervalMs = Math.max(1, ms);
    this._timeUntilPickMs = Math.min(this._timeUntilPickMs, this.changeIntervalMs);
  }

  pickDirection(): Vec2 {
    const angle = Math.random() * Math.PI * 2;
    this._dir = { x: Math.cos(angle), y: Math.sin(angle) };
    return this._dir;
  }

  getDirection(): Vec2 {
    return { x: this._dir.x, y: this._dir.y };
  }

  resetOrigin(origin?: Vec2): void {
    this._origin = origin ? { x: origin.x, y: origin.y } : undefined;
  }

  updateWander(dtMs: number): void {
    this._timeUntilPickMs -= Math.max(0, dtMs);
    if (this._timeUntilPickMs > 0) return;
    this.pickDirection();
    this._timeUntilPickMs = this.changeIntervalMs;
  }
}

