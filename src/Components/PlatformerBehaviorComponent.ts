export class PlatformerBehaviorComponent {
  // Horizontal motion
  private _maxSpeedX: number; // px/s
  private _accel: number; // how fast to reach target (force factor)
  private _decel: number; // braking force factor
  private _airControl: number; // 0..1

  // Jump
  private _jumpImpulse: number; // impulse force applied on jump
  private _jumpCutMultiplier: number; // when releasing jump early, reduce upward velocity

  constructor(init?: Partial<PlatformerBehaviorComponent>) {
    this._maxSpeedX = init?.maxSpeedX ?? 7;
    this._accel = init?.accel ?? 0.0022;
    this._decel = init?.decel ?? 0.003;
    this._airControl = init?.airControl ?? 0.5;

    this._jumpImpulse = init?.jumpImpulse ?? 0.22;
    this._jumpCutMultiplier = init?.jumpCutMultiplier ?? 0.45;
  }

  get maxSpeedX(): number {
    return this._maxSpeedX;
  }
  set maxSpeedX(value: number) {
    this._maxSpeedX = value;
  }

  get accel(): number {
    return this._accel;
  }
  set accel(value: number) {
    this._accel = value;
  }

  get decel(): number {
    return this._decel;
  }
  set decel(value: number) {
    this._decel = value;
  }

  get airControl(): number {
    return this._airControl;
  }
  set airControl(value: number) {
    this._airControl = value;
  }

  get jumpImpulse(): number {
    return this._jumpImpulse;
  }
  set jumpImpulse(value: number) {
    this._jumpImpulse = value;
  }

  get jumpCutMultiplier(): number {
    return this._jumpCutMultiplier;
  }
  set jumpCutMultiplier(value: number) {
    this._jumpCutMultiplier = value;
  }
}

