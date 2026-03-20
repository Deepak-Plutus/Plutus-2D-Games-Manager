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
}

