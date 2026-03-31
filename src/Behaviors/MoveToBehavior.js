import { BaseBehavior } from './BaseBehavior.js';
import { moveToBehaviorDefaults } from './Config/moveToBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/move
 */
export class MoveToBehavior extends BaseBehavior {
  static type = 'moveTo';
  static priority = 15;

  static defaultProperties = { ...moveToBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._vx = 0;
    /** @private */
    this._vy = 0;
    /** @private */
    this._moving = this.autoStart;
  }

  applyJsonProperties(json) {
    if (json.targetX != null) this.targetX = Number(json.targetX);
    if (json.targetY != null) this.targetY = Number(json.targetY);
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed);
    if (json.acceleration != null) this.acceleration = Number(json.acceleration);
    if (json.arriveDistance != null) this.arriveDistance = Number(json.arriveDistance);
    if (json.rotateToward != null) this.rotateToward = !!json.rotateToward;
    if (json.autoStart != null) {
      this.autoStart = !!json.autoStart;
      this._moving = this.autoStart;
    }
  }

  get isMoving() {
    return this._moving;
  }

  setDestination(x, y) {
    this.targetX = Number(x);
    this.targetY = Number(y);
    this._moving = true;
  }

  stop() {
    this._moving = false;
    this._vx = 0;
    this._vy = 0;
  }

  start() {
    this._moving = true;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled() || !this._moving) return;
    const { transform, dt, events, entityId } = ctx;
    const dx = this.targetX - transform.x;
    const dy = this.targetY - transform.y;
    const d = Math.hypot(dx, dy);

    if (d <= this.arriveDistance) {
      transform.x = this.targetX;
      transform.y = this.targetY;
      this._vx = 0;
      this._vy = 0;
      this._moving = false;
      events?.emit('moveTo:arrived', { entityId, x: transform.x, y: transform.y });
      return;
    }

    const dirx = dx / d;
    const diry = dy / d;
    const txv = dirx * this.maxSpeed;
    const tyv = diry * this.maxSpeed;
    this._vx = moveToward(this._vx, txv, this.acceleration * dt);
    this._vy = moveToward(this._vy, tyv, this.acceleration * dt);

    transform.x += this._vx * dt;
    transform.y += this._vy * dt;
    if (this.rotateToward) transform.rotation = Math.atan2(dy, dx);
  }
}

/**
 * @param {number} current
 * @param {number} target
 * @param {number} maxStep
 */
function moveToward(current, target, maxStep) {
  const d = target - current;
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}
