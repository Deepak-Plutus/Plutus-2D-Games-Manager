import type { Vec2 } from "./TransformComponent";

export type PatrolBehaviorComponentProps = {
  range?: number;
  speed?: number;
  startX?: number;
  dir?: 1 | -1;
  path?: Vec2[];
};

export class PatrolBehaviorComponent {
  static readonly type = "PatrolBehavior";
  readonly type = PatrolBehaviorComponent.type;

  private _range: number; // pixels
  private _speed: number; // px/s (used as velocity target)

  // runtime state
  private _startX?: number;
  private _dir: 1 | -1;
  private _path: Vec2[];
  private _pathIndex: number;

  constructor(init?: PatrolBehaviorComponentProps) {
    this._range = init?.range ?? 200;
    this._speed = init?.speed ?? 2;
    this._startX = init?.startX;
    this._dir = init?.dir ?? 1;
    this._path = Array.isArray(init?.path) ? init!.path!.map((p) => ({ x: p.x, y: p.y })) : [];
    this._pathIndex = 0;
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

  get startX(): number | undefined {
    return this._startX;
  }
  set startX(value: number | undefined) {
    this._startX = value;
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

  // Doc: setPath(points)
  setPath(points: Vec2[]): void {
    this._path = Array.isArray(points) ? points.map((p) => ({ x: p.x, y: p.y })) : [];
    this._pathIndex = 0;
  }

  // Doc: updatePatrol(dt)
  updatePatrol(_dtMs: number): void {
    if (this._path.length < 2) return;
    this._pathIndex = (this._pathIndex + 1) % this._path.length;
  }

  // Doc: reverseDirection()
  reverseDirection(): void {
    this._dir = this._dir === 1 ? -1 : 1;
  }
}

