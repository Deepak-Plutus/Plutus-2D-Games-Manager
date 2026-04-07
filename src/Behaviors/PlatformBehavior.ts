import { BaseBehavior } from './BaseBehavior.js';
import { PLATFORM_SIMULATE_CONTROL_MAP } from './Config/platformSimulateConfig.js';
import { isAnyKeyDown } from './KeyBindings.js';
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js';

type JsonRecord = Record<string, unknown>;
type KeyBindings = { left: string[]; right: string[]; jump: string[] } & Record<string, string[]>;

/**
 * Construct 3-style Platform movement with solid/jump-thru support.
 *
 * Provides keyboard/simulated input, acceleration, gravity, jump sustain,
 * and collision solving against solid/jump-thru colliders.
 *
 * @example
 * { "type": "platform", "maxSpeed": 320, "jumpStrength": 560 }
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
    useLayoutFloor: true,
  };

  maxSpeed = 330;
  acceleration = 1500;
  deceleration = 1500;
  jumpStrength = 650;
  gravity = 1500;
  maxFallSpeed = 1000;
  jumpSustain = 300;
  defaultControls = true;
  keyBindings: KeyBindings = {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    jump: ['ArrowUp'],
  };
  useLayoutFloor = true;

  private _vx = 0;
  private _vy = 0;
  private _jumpSustainMs = 0;
  private _onFloor = false;
  private _simLeft = false;
  private _simRight = false;
  private _simJump = false;

  constructor(json: JsonRecord = {}) {
    super(json);
    this._vx = 0;
    this._vy = 0;
    this._jumpSustainMs = 0;
    this._onFloor = false;
    this._simLeft = false;
    this._simRight = false;
    this._simJump = false;
  }

  /**
   * Applies movement and control properties from JSON.
   *
   * @param {JsonRecord} json Raw behavior config.
   * @returns {void} Nothing.
   */
  applyJsonProperties(json: JsonRecord): void {
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
      this.updateKeyBindings(json.keyBindings as JsonRecord);
    }
  }

  /**
   * Merges keybinding overrides.
   *
   * @param {JsonRecord} partial Partial keybinding map.
   * @returns {void} Nothing.
   */
  updateKeyBindings(partial: JsonRecord): void {
    if (!partial || typeof partial !== 'object') return;
    for (const [action, codes] of Object.entries(partial)) {
      if (!Array.isArray(codes)) continue;
      this.keyBindings[action] = codes.map((c) => String(c));
    }
  }

  /**
   * Injects one-frame simulated control input.
   *
   * @param {string} control Control label (left/right/jump aliases).
   * @returns {void} Nothing.
   */
  simulateControl(control: string): void {
    const c = String(control).toLowerCase().trim();
    const key = c as keyof typeof PLATFORM_SIMULATE_CONTROL_MAP;
    const prop = PLATFORM_SIMULATE_CONTROL_MAP[key];
    if (!prop) return;
    if (prop === '_simLeft') this._simLeft = true;
    if (prop === '_simRight') this._simRight = true;
    if (prop === '_simJump') this._simJump = true;
  }

  /**
   * Sets current horizontal velocity.
   *
   * @param {number} v New velocity X.
   * @returns {void} Nothing.
   */
  setVectorX(v: number): void {
    this._vx = Number(v);
  }
  /**
   * Sets current vertical velocity.
   *
   * @param {number} v New velocity Y.
   * @returns {void} Nothing.
   */
  setVectorY(v: number): void {
    this._vy = Number(v);
  }
  /**
   * Current vertical velocity.
   *
   * @returns {number} Current vertical velocity.
   */
  get vectorY(): number {
    return this._vy;
  }
  /**
   * Whether character is grounded after last integration step.
   *
   * @returns {boolean} True when grounded.
   */
  get isOnFloor(): boolean {
    return this._onFloor;
  }

  /**
   * Performs one platformer movement simulation step.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick(ctx: BehaviorRuntimeContext): void {
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
    if (!jump) this._jumpSustainMs = 0;

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
