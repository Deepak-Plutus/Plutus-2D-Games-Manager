export type PhysicsControllerMode = 'platformer' | 'topdown';

export class PhysicsControllerComponent {
  private _mode: PhysicsControllerMode;
  private _moveSpeed: number; // px/s (interpreted by controller system)
  private _jumpImpulse: number; // impulse (platformer)
  private _maxSpeedX: number;
  private _maxSpeedY: number;
  private _airControl: number; // 0..1

  constructor(init?: Partial<PhysicsControllerComponent>) {
    this._mode = init?.mode ?? 'platformer';
    this._moveSpeed = init?.moveSpeed ?? 6;
    this._jumpImpulse = init?.jumpImpulse ?? 0.18;
    this._maxSpeedX = init?.maxSpeedX ?? 8;
    this._maxSpeedY = init?.maxSpeedY ?? 20;
    this._airControl = init?.airControl ?? 0.4;
  }

  get mode(): PhysicsControllerMode {
    return this._mode;
  }
  set mode(value: PhysicsControllerMode) {
    this._mode = value;
  }

  get moveSpeed(): number {
    return this._moveSpeed;
  }
  set moveSpeed(value: number) {
    this._moveSpeed = value;
  }

  get jumpImpulse(): number {
    return this._jumpImpulse;
  }
  set jumpImpulse(value: number) {
    this._jumpImpulse = value;
  }

  get maxSpeedX(): number {
    return this._maxSpeedX;
  }
  set maxSpeedX(value: number) {
    this._maxSpeedX = value;
  }

  get maxSpeedY(): number {
    return this._maxSpeedY;
  }
  set maxSpeedY(value: number) {
    this._maxSpeedY = value;
  }

  get airControl(): number {
    return this._airControl;
  }
  set airControl(value: number) {
    this._airControl = value;
  }
}

