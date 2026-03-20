export type MovingPlatformAxis = 'x' | 'y';

export class MovingPlatformComponent {
  private _axis: MovingPlatformAxis;
  private _range: number;
  private _speed: number;
  private _start?: number;
  private _dir: 1 | -1;

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
}
