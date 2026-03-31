import { BaseBehavior } from './BaseBehavior.js';
import { carBehaviorDefaults } from './Config/carBehaviorConfig.js';
import { isAnyKeyDown } from './KeyBindings.js';

const DEG = Math.PI / 180;

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/car
 */
export class CarBehavior extends BaseBehavior {
  static type = 'car';
  static priority = 14;

  static defaultProperties = { ...carBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._speed = 0;
    /** @private */
    this._heading = /** @type {number | null} */ (null);
    /** @private */
    this._simAccel = 0;
    /** @private */
    this._simSteer = 0;
  }

  applyJsonProperties(json) {
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed);
    if (json.acceleration != null) this.acceleration = Number(json.acceleration);
    if (json.deceleration != null) this.deceleration = Number(json.deceleration);
    if (json.steerSpeed != null) this.steerSpeed = Number(json.steerSpeed);
    if (json.defaultControls != null) this.defaultControls = !!json.defaultControls;
    if (json.driftFactor != null) this.driftFactor = Number(json.driftFactor);
    if (json.keyBindings != null && typeof json.keyBindings === 'object') {
      this.updateKeyBindings(/** @type {Record<string, unknown>} */ (json.keyBindings));
    }
  }

  updateKeyBindings(partial) {
    if (!partial || typeof partial !== 'object') return;
    for (const [action, codes] of Object.entries(partial)) {
      if (!Array.isArray(codes)) continue;
      this.keyBindings[action] = codes.map((c) => String(c));
    }
  }

  getKeyBindings() {
    const out = {};
    for (const [k, v] of Object.entries(this.keyBindings)) {
      out[k] = [...v];
    }
    return out;
  }

  get speed() {
    return this._speed;
  }

  getVector() {
    const th = this._heading;
    return { x: Math.cos(th) * this._speed, y: Math.sin(th) * this._speed };
  }

  /**
   * @param {'accelerate'|'brake'|'steerLeft'|'steerRight'|string} control
   */
  simulateControl(control) {
    const c = String(control).toLowerCase().trim();
    if (c === 'accelerate' || c === 'forward' || c === 'up') this._simAccel += 1;
    if (c === 'brake' || c === 'reverse' || c === 'down') this._simAccel -= 1;
    if (c === 'steerleft' || c === 'left') this._simSteer -= 1;
    if (c === 'steerright' || c === 'right') this._simSteer += 1;
  }

  setMaxSpeed(v) {
    this.maxSpeed = Number(v);
  }

  setAcceleration(v) {
    this.acceleration = Number(v);
  }

  setDeceleration(v) {
    this.deceleration = Number(v);
  }

  setSteerSpeed(v) {
    this.steerSpeed = Number(v);
  }

  stop() {
    this._speed = 0;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, dt, input } = ctx;

    if (this._heading == null) this._heading = transform.rotation;

    let throttle = Math.max(-1, Math.min(1, this._simAccel));
    let steer = Math.max(-1, Math.min(1, this._simSteer));
    this._simAccel = 0;
    this._simSteer = 0;

    if (this.defaultControls && input) {
      if (isAnyKeyDown(input, this.keyBindings.accelerate)) throttle += 1;
      if (isAnyKeyDown(input, this.keyBindings.brake)) throttle -= 1;
      if (isAnyKeyDown(input, this.keyBindings.steerLeft)) steer -= 1;
      if (isAnyKeyDown(input, this.keyBindings.steerRight)) steer += 1;
    }
    throttle = Math.max(-1, Math.min(1, throttle));
    steer = Math.max(-1, Math.min(1, steer));

    if (Math.abs(this._speed) > 1) {
      const turn = steer * this.steerSpeed * DEG * dt * Math.sign(this._speed);
      this._heading += turn;
    } else if (Math.abs(steer) > 0.01) {
      this._heading += steer * this.steerSpeed * DEG * dt * 0.35;
    }

    if (throttle > 0) {
      this._speed = moveToward(this._speed, this.maxSpeed, this.acceleration * dt);
    } else if (throttle < 0) {
      this._speed = moveToward(this._speed, -this.maxSpeed * 0.55, this.acceleration * dt);
    } else {
      const dec = this.deceleration * dt;
      if (Math.abs(this._speed) <= dec) this._speed = 0;
      else this._speed -= Math.sign(this._speed) * dec;
    }

    const vx = Math.cos(this._heading) * this._speed;
    const vy = Math.sin(this._heading) * this._speed;
    transform.x += vx * dt;
    transform.y += vy * dt;
    transform.rotation = this._heading;
  }
}

function moveToward(cur, target, maxStep) {
  const d = target - cur;
  if (Math.abs(d) <= maxStep) return target;
  return cur + Math.sign(d) * maxStep;
}
