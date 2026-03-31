import { BaseBehavior } from './BaseBehavior.js';
import { PLATFORM_SIMULATE_CONTROL_MAP } from './Config/platformSimulateConfig.js';
import { isAnyKeyDown } from './KeyBindings.js';

/**
 * Construct 3–style Platform movement. Uses layout floor and optional solid/jump-thru colliders.
 *
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/platform
 */
export class PlatformBehavior extends BaseBehavior {
  static type = 'platform';
  static priority = 10;

  static defaultProperties = {
    maxSpeed: 330,
    acceleration: 1500,
    deceleration: 1500,
    jumpStrength: 650,
    gravity: 1500,
    maxFallSpeed: 1000,
    jumpSustain: 300,
    defaultControls: true,
    keyBindings: {
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
      jump: ['ArrowUp'],
    },
    /** Clamp to layout bottom when no solid is below. Disable for pit/death-zone gameplay. */
    useLayoutFloor: true,
  };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._vx = 0;
    /** @private */
    this._vy = 0;
    /** @private */
    this._jumpSustainMs = 0;
    /** @private */
    this._onFloor = false;
    /** @private */
    this._simLeft = false;
    /** @private */
    this._simRight = false;
    /** @private */
    this._simJump = false;
  }

  applyJsonProperties(json) {
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed);
    if (json.acceleration != null) this.acceleration = Number(json.acceleration);
    if (json.deceleration != null) this.deceleration = Number(json.deceleration);
    if (json.jumpStrength != null) this.jumpStrength = Number(json.jumpStrength);
    if (json.gravity != null) this.gravity = Number(json.gravity);
    if (json.maxFallSpeed != null) this.maxFallSpeed = Number(json.maxFallSpeed);
    if (json.jumpSustain != null) this.jumpSustain = Number(json.jumpSustain);
    if (json.defaultControls != null) this.defaultControls = !!json.defaultControls;
    if (json.useLayoutFloor != null) this.useLayoutFloor = !!json.useLayoutFloor;
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

  get vectorX() {
    return this._vx;
  }

  get vectorY() {
    return this._vy;
  }

  get isOnFloor() {
    return this._onFloor;
  }

  get isMoving() {
    return Math.abs(this._vx) > 0.5 || Math.abs(this._vy) > 0.5;
  }

  getVector() {
    return { x: this._vx, y: this._vy };
  }

  /** Logical control ids (`left` | `right` | `jump`), not key codes. */
  simulateControl(control) {
    const c = String(control).toLowerCase().trim();
    const prop = PLATFORM_SIMULATE_CONTROL_MAP[c];
    if (prop) this[prop] = true;
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

  setGravity(v) {
    this.gravity = Number(v);
  }

  setJumpStrength(v) {
    this.jumpStrength = Number(v);
  }

  setMaxFallSpeed(v) {
    this.maxFallSpeed = Number(v);
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;

    const { transform, dt, input, layoutHeight, displaySize, colliders, entityId } = ctx;
    const w = displaySize?.width ?? 32;
    const h = displaySize?.height ?? 32;
    const halfH = (Math.abs(h) * Math.abs(transform.scaleY)) / 2;
    const halfW = (Math.abs(w) * Math.abs(transform.scaleX)) / 2;
    const floorY = layoutHeight - halfH;
    const prevY = transform.y;
    const groundedStart = this._onFloor;

    let left = this._simLeft;
    let right = this._simRight;
    let jump = this._simJump;
    if (this.defaultControls && input) {
      left ||= isAnyKeyDown(input, this.keyBindings.left);
      right ||= isAnyKeyDown(input, this.keyBindings.right);
      jump ||= isAnyKeyDown(input, this.keyBindings.jump);
    }
    this._simLeft = false;
    this._simRight = false;
    this._simJump = false;

    let target = 0;
    if (left && !right) target = -this.maxSpeed;
    else if (right && !left) target = this.maxSpeed;

    if (target !== 0) {
      const dir = Math.sign(target);
      this._vx += this.acceleration * dir * dt;
      if ((dir > 0 && this._vx > target) || (dir < 0 && this._vx < target)) {
        this._vx = target;
      }
    } else {
      const dec = this.deceleration * dt;
      if (Math.abs(this._vx) <= dec) this._vx = 0;
      else this._vx -= Math.sign(this._vx) * dec;
    }

    if (groundedStart) {
      if (this._vy > 0) this._vy = 0;
    } else {
      this._vy += this.gravity * dt;
      if (this._vy > this.maxFallSpeed) this._vy = this.maxFallSpeed;
    }

    if (groundedStart && jump) {
      this._vy = -this.jumpStrength;
      this._jumpSustainMs = this.jumpSustain;
      this._onFloor = false;
    }

    if (jump && this._jumpSustainMs > 0) {
      this._jumpSustainMs -= dt * 1000;
      this._vy -= (this.jumpStrength / Math.max(this.jumpSustain / 1000, 0.001)) * dt * 0.35;
    }
    if (!jump) {
      this._jumpSustainMs = 0;
    }

    const prevX = transform.x;
    let nextX = transform.x + this._vx * dt;
    if (colliders?.length) {
      for (const p of colliders) {
        if (p.entityId === entityId || p.kind !== 'solid') continue;
        const charTop = transform.y - halfH;
        const charBottom = transform.y + halfH;
        if (charBottom <= p.top || charTop >= p.bottom) continue;
        const prevLeft = prevX - halfW;
        const prevRight = prevX + halfW;
        const nextLeft = nextX - halfW;
        const nextRight = nextX + halfW;
        if (this._vx > 0 && prevRight <= p.left && nextRight >= p.left) {
          nextX = p.left - halfW;
          this._vx = 0;
        } else if (this._vx < 0 && prevLeft >= p.right && nextLeft <= p.right) {
          nextX = p.right + halfW;
          this._vx = 0;
        }
      }
    }
    transform.x = nextX;

    const prevFeet = prevY + halfH;
    let nextY = transform.y + this._vy * dt;
    let nextFeet = nextY + halfH;
    let landedOnCollider = false;

    if (colliders?.length) {
      for (const p of colliders) {
        if (p.entityId === entityId) continue;
        const active = p.kind === 'solid' || (p.kind === 'jumpThru' && this._vy > 0);
        if (!active) continue;
        const charLeft = transform.x - halfW;
        const charRight = transform.x + halfW;
        if (charRight <= p.left || charLeft >= p.right) continue;
        if (this._vy >= 0 && prevFeet <= p.top + 2 && nextFeet >= p.top - 1) {
          nextY = p.top - halfH;
          this._vy = 0;
          landedOnCollider = true;
          break;
        }
      }
    }

    transform.y = nextY;
    this._onFloor = landedOnCollider;

    if (this.useLayoutFloor && !this._onFloor && transform.y >= floorY) {
      transform.y = floorY;
      if (this._vy > 0) this._vy = 0;
      this._onFloor = true;
    }
  }
}
