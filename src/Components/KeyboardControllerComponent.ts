export class KeyboardControllerComponent {
  private _speed: number;

  constructor(init?: Partial<KeyboardControllerComponent>) {
    this._speed = init?.speed ?? 250;
  }

  get speed(): number {
    return this._speed;
  }

  set speed(value: number) {
    this._speed = value;
  }
}

