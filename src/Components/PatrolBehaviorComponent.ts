export class PatrolBehaviorComponent {
  private _range: number; // pixels
  private _speed: number; // px/s (used as velocity target)

  // runtime state
  private _startX?: number;
  private _dir: 1 | -1;

  constructor(init?: Partial<PatrolBehaviorComponent>) {
    this._range = init?.range ?? 200;
    this._speed = init?.speed ?? 2;
    this._startX = init?.startX;
    this._dir = init?.dir ?? 1;
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
}

