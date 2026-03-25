export type MovingPlatformAxis = 'x' | 'y';
type Vec2 = { x: number; y: number };

export class MovingPlatformComponent {
  private _axis: MovingPlatformAxis;
  private _range: number;
  private _speed: number;
  private _start?: number;
  private _dir: 1 | -1;
  private _path: Vec2[] = [];

  constructor(init?: Partial<MovingPlatformComponent>) {
    this._axis = init?.axis ?? 'x';
    this._range = init?.range ?? 160;
    this._speed = init?.speed ?? 80;
    this._start = init?.start;
    this._dir = init?.dir ?? 1;
  }

  get axis(): MovingPlatformAxis {
    return this._axis;
  }
  set axis(value: MovingPlatformAxis) {
    this._axis = value;
  }

  get range(): number {
    return this._range;
  }
  set range(value: number) {
    this._range = value;
  }

  get speed(): number {
    return this._speed;
  }
  set speed(value: number) {
    this._speed = value;
  }

  get start(): number | undefined {
    return this._start;
  }
  set start(value: number | undefined) {
    this._start = value;
  }

  get dir(): 1 | -1 {
    return this._dir;
  }
  set dir(value: 1 | -1) {
    this._dir = value;
  }

  get path(): Vec2[] {
    return this._path;
  }

  setPath(points: Vec2[]): void {
    this._path = Array.isArray(points) ? points.map((p) => ({ x: p.x, y: p.y })) : [];
    if (this._path.length < 2) return;
    const a = this._path[0];
    const b = this._path[1];
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    this._axis = dx >= dy ? 'x' : 'y';
    const coords = this._path.map((p) => (this._axis === 'x' ? p.x : p.y));
    const min = Math.min(...coords);
    const max = Math.max(...coords);
    this._start = (min + max) * 0.5;
    this._range = Math.max(0, (max - min) * 0.5);
  }

  setSpeed(v: number): void {
    if (!Number.isFinite(v)) return;
    this._speed = Math.max(0, v);
  }

  updateMovement(_dtMs: number): void {
    // Integration is handled by MovingPlatformSystem; this method keeps doc API parity.
  }
}
