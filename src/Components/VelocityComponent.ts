export class VelocityComponent {
  private _x: number;
  private _y: number;

  constructor(init?: Partial<VelocityComponent>) {
    this._x = init?.x ?? 0;
    this._y = init?.y ?? 0;
  }

  get x(): number {
    return this._x;
  }

  set x(value: number) {
    this._x = value;
  }

  get y(): number {
    return this._y;
  }

  set y(value: number) {
    this._y = value;
  }

  setVelocity(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this._x = x;
    this._y = y;
  }

  addVelocity(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this._x += x;
    this._y += y;
  }

  clamp(max: number): void {
    if (!Number.isFinite(max) || max < 0) return;
    const s = this.getSpeed();
    if (s <= max || s <= 1e-9) return;
    const k = max / s;
    this._x *= k;
    this._y *= k;
  }

  stop(): void {
    this._x = 0;
    this._y = 0;
  }

  getSpeed(): number {
    return Math.hypot(this._x, this._y);
  }

  setSpeed(speed: number): void {
    if (!Number.isFinite(speed) || speed < 0) return;
    const mag = this.getSpeed();
    if (mag <= 1e-9) {
      this._x = speed;
      this._y = 0;
      return;
    }
    const k = speed / mag;
    this._x *= k;
    this._y *= k;
  }

  scale(multiplier: number): void {
    if (!Number.isFinite(multiplier)) return;
    this._x *= multiplier;
    this._y *= multiplier;
  }

  getDirection(): { x: number; y: number } {
    const mag = this.getSpeed();
    if (mag <= 1e-9) return { x: 0, y: 0 };
    return { x: this._x / mag, y: this._y / mag };
  }
}

