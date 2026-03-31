import { BaseBehavior } from './BaseBehavior.js';
import { EIGHT_DIRECTION_SIMULATE_DELTA } from './Config/eightDirectionSimulateConfig.js';
import { isAnyKeyDown } from './KeyBindings.js';

/**
 * Construct 3–style 8-direction movement.
 *
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/8-direction
 */
export class EightDirectionBehavior extends BaseBehavior {
  static type = 'eightDirection';
  static priority = 10;

  static defaultProperties = {
    maxSpeed: 200,
    acceleration: 1500,
    deceleration: 1500,
    /** 8 | 4 — 4 = cardinals only */
    directions: 8,
    defaultControls: true,
    allowDiagonal: true,
    /**
     * `KeyboardEvent.code` lists per direction. Default: arrow keys only.
     * @type {{ left: string[], right: string[], up: string[], down: string[] }}
     */
    keyBindings: {
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      up: ['ArrowUp'],
      down: ['ArrowDown'],
    },
  };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._vx = 0;
    /** @private */
    this._vy = 0;
    /** @private */
    this._simDx = 0;
    /** @private */
    this._simDy = 0;
  }

  applyJsonProperties(json) {
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed);
    if (json.acceleration != null) this.acceleration = Number(json.acceleration);
    if (json.deceleration != null) this.deceleration = Number(json.deceleration);
    if (json.directions != null) this.directions = Number(json.directions);
    if (json.defaultControls != null) this.defaultControls = !!json.defaultControls;
    if (json.allowDiagonal != null) this.allowDiagonal = !!json.allowDiagonal;
    if (json.keyBindings != null && typeof json.keyBindings === 'object') {
      this.updateKeyBindings(/** @type {Record<string, unknown>} */ (json.keyBindings));
    }
  }

  /**
   * @param {Record<string, string[] | unknown>} partial e.g. `{ left: ['KeyA'], up: ['KeyW','ArrowUp'] }`
   */
  updateKeyBindings(partial) {
    if (!partial || typeof partial !== 'object') return;
    for (const [action, codes] of Object.entries(partial)) {
      if (!Array.isArray(codes)) continue;
      this.keyBindings[action] = codes.map((c) => String(c));
    }
  }

  /** @returns {Readonly<Record<string, string[]>>} shallow copy of binding lists */
  getKeyBindings() {
    const out = {};
    for (const [k, v] of Object.entries(this.keyBindings)) {
      out[k] = [...v];
    }
    return out;
  }

  get vectorX() {
    return this._vx;
  }

  get vectorY() {
    return this._vy;
  }

  get speed() {
    return Math.hypot(this._vx, this._vy);
  }

  get isMoving() {
    return this.speed > 0.5;
  }

  get movingAngle() {
    return Math.atan2(this._vy, this._vx);
  }

  getVector() {
    return { x: this._vx, y: this._vy };
  }

  /**
   * Logical control ids (Construct `simulate control`), not keyboard codes.
   * @param {'left'|'right'|'up'|'down'|string} control
   */
  simulateControl(control) {
    const c = String(control).toLowerCase().trim();
    const d = EIGHT_DIRECTION_SIMULATE_DELTA[c];
    if (d) {
      this._simDx += d.dx;
      this._simDy += d.dy;
    }
  }

  stop() {
    this._vx = 0;
    this._vy = 0;
  }

  setVectorX(v) {
    this._vx = Number(v);
  }

  setVectorY(v) {
    this._vy = Number(v);
  }

  setVector(x, y) {
    this._vx = Number(x);
    this._vy = Number(y);
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

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;

    const { transform, dt, input } = ctx;
    let dx = Math.max(-1, Math.min(1, this._simDx));
    let dy = Math.max(-1, Math.min(1, this._simDy));
    this._simDx = 0;
    this._simDy = 0;

    if (this.defaultControls && input) {
      if (isAnyKeyDown(input, this.keyBindings.left)) dx -= 1;
      if (isAnyKeyDown(input, this.keyBindings.right)) dx += 1;
      if (isAnyKeyDown(input, this.keyBindings.up)) dy -= 1;
      if (isAnyKeyDown(input, this.keyBindings.down)) dy += 1;
    }

    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));

    if (this.directions === 4) {
      if (dx !== 0 && dy !== 0) {
        if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
        else dx = 0;
      }
    }

    if (!this.allowDiagonal && dx !== 0 && dy !== 0) {
      if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
      else dx = 0;
    }

    const len = Math.hypot(dx, dy);
    let tx = 0;
    let ty = 0;
    if (len > 0) {
      tx = (dx / len) * this.maxSpeed;
      ty = (dy / len) * this.maxSpeed;
    }

    const ax = this.acceleration * dt;
    const dec = this.deceleration * dt;

    if (tx === 0 && ty === 0) {
      const sl = Math.hypot(this._vx, this._vy);
      if (sl <= dec || sl === 0) {
        this._vx = 0;
        this._vy = 0;
      } else {
        this._vx -= (this._vx / sl) * dec;
        this._vy -= (this._vy / sl) * dec;
      }
    } else {
      this._vx = moveToward(this._vx, tx, ax);
      this._vy = moveToward(this._vy, ty, ax);
    }

    transform.x += this._vx * dt;
    transform.y += this._vy * dt;
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
