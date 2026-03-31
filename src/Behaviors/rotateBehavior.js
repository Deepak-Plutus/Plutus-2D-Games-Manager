import { BaseBehavior } from './BaseBehavior.js';
import { rotateBehaviorDefaults } from './Config/rotateBehaviorConfig.js';

const DEG = Math.PI / 180;

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/rotate
 */
export class RotateBehavior extends BaseBehavior {
  static type = 'rotate';
  static priority = 50;

  static defaultProperties = { ...rotateBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._speedCurrent = this.speed;
  }

  applyJsonProperties(json) {
    if (json.speed != null) {
      this.speed = Number(json.speed);
      this._speedCurrent = this.speed;
    }
    if (json.acceleration != null) this.acceleration = Number(json.acceleration);
  }

  setSpeed(degPerSec) {
    this.speed = Number(degPerSec);
    this._speedCurrent = this.speed;
  }

  setAcceleration(degPerSec2) {
    this.acceleration = Number(degPerSec2);
  }

  get angularSpeed() {
    return this._speedCurrent;
  }

  /** Expression-style (deg/s) */
  get Speed() {
    return this._speedCurrent;
  }
  get Acceleration() {
    return this.acceleration;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, dt } = ctx;
    this._speedCurrent += this.acceleration * dt;
    transform.rotation += this._speedCurrent * DEG * dt;
  }
}
