import { BaseBehavior } from './BaseBehavior.js';
import { physicsBehaviorDefaults } from './Config/physicsBehaviorConfig.js';

/**
 * Arcade-style velocity + gravity with solid AABB resolution (Construct Physics–like subset).
 *
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/physics
 */
export class PhysicsBehavior extends BaseBehavior {
  static type = 'physics';
  static priority = 13;

  static defaultProperties = { ...physicsBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._impulseX = 0;
    /** @private */
    this._impulseY = 0;
    /** @private */
    this._impulseAng = 0;
  }

  applyJsonProperties(json) {
    if (json.velocityX != null) this.velocityX = Number(json.velocityX);
    if (json.velocityY != null) this.velocityY = Number(json.velocityY);
    if (json.angularVelocity != null) this.angularVelocity = Number(json.angularVelocity);
    if (json.gravity != null) this.gravity = Number(json.gravity);
    if (json.linearDamping != null) this.linearDamping = Number(json.linearDamping);
    if (json.angularDamping != null) this.angularDamping = Number(json.angularDamping);
    if (json.elasticity != null) this.elasticity = Number(json.elasticity);
    if (json.friction != null) this.friction = Number(json.friction);
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed);
    if (json.applyAngularVelocity != null) this.applyAngularVelocity = !!json.applyAngularVelocity;
  }

  setVelocity(x, y) {
    this.velocityX = Number(x);
    this.velocityY = Number(y);
  }

  setAngularVelocity(radPerSec) {
    this.angularVelocity = Number(radPerSec);
  }

  applyImpulse(ix, iy) {
    this._impulseX += Number(ix);
    this._impulseY += Number(iy);
  }

  applyImpulseAtAngle(speed, angleDeg) {
    const r = (Number(angleDeg) * Math.PI) / 180;
    this._impulseX += Math.cos(r) * speed;
    this._impulseY += Math.sin(r) * speed;
  }

  applyTorque(impulse) {
    this._impulseAng += Number(impulse);
  }

  /** Assumes unit mass: velocity delta = F·dt */
  applyForce(fx, fy, dt) {
    this._impulseX += Number(fx) * dt;
    this._impulseY += Number(fy) * dt;
  }

  get speed() {
    return Math.hypot(this.velocityX, this.velocityY);
  }

  get velocityAngle() {
    return Math.atan2(this.velocityY, this.velocityX);
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, dt, colliders, entityId, displaySize } = ctx;

    this.velocityX += this._impulseX;
    this.velocityY += this._impulseY;
    this._impulseX = 0;
    this._impulseY = 0;

    const dampLin = Math.max(0, Math.min(1, this.linearDamping * dt));
    this.velocityX *= 1 - dampLin;
    this.velocityY *= 1 - dampLin;

    this.velocityY += this.gravity * dt;

    const sp = Math.hypot(this.velocityX, this.velocityY);
    if (sp > this.maxSpeed && sp > 0) {
      const s = this.maxSpeed / sp;
      this.velocityX *= s;
      this.velocityY *= s;
    }

    let nx = transform.x + this.velocityX * dt;
    let ny = transform.y + this.velocityY * dt;
    let pvx = this.velocityX;
    let pvy = this.velocityY;

    if (this.applyAngularVelocity) {
      this.angularVelocity += this._impulseAng;
      this._impulseAng = 0;
      const dampA = Math.max(0, Math.min(1, this.angularDamping * dt));
      this.angularVelocity *= 1 - dampA;
      transform.rotation += this.angularVelocity * dt;
    } else {
      this._impulseAng = 0;
    }

    const w = displaySize?.width ?? 32;
    const h = displaySize?.height ?? 32;
    const halfW = (Math.abs(w) * Math.abs(transform.scaleX)) / 2;
    const halfH = (Math.abs(h) * Math.abs(transform.scaleY)) / 2;

    if (colliders?.length) {
      for (let iter = 0; iter < 4; iter++) {
        const res = resolveAabb(
          transform.x,
          transform.y,
          nx,
          ny,
          halfW,
          halfH,
          colliders,
          entityId,
          this.elasticity,
          this.friction,
          pvx,
          pvy,
        );
        nx = res.x;
        ny = res.y;
        pvx = res.vx;
        pvy = res.vy;
      }
      this.velocityX = pvx;
      this.velocityY = pvy;
    }

    transform.x = nx;
    transform.y = ny;
  }
}

/**
 * @param {import('../Core/CollisionService.js').ColliderAabb[]} colliders
 */
function resolveAabb(ox, oy, nx, ny, hw, hh, colliders, selfId, elasticity, friction, vx, vy) {
  let x = nx;
  let y = ny;
  let outVx = vx;
  let outVy = vy;

  const charLeft = x - hw;
  const charRight = x + hw;
  const charTop = y - hh;
  const charBottom = y + hh;

  for (const c of colliders) {
    if (c.entityId === selfId) continue;
    if (c.kind !== 'solid') continue;
    if (charRight <= c.left || charLeft >= c.right || charBottom <= c.top || charTop >= c.bottom)
      continue;

    const overlapL = charRight - c.left;
    const overlapR = c.right - charLeft;
    const overlapT = charBottom - c.top;
    const overlapB = c.bottom - charTop;
    const minO = Math.min(overlapL, overlapR, overlapT, overlapB);

    if (minO === overlapL || minO === overlapR) {
      if (minO === overlapL) {
        x = c.left - hw;
        outVx *= -elasticity;
      } else {
        x = c.right + hw;
        outVx *= -elasticity;
      }
      outVy *= 1 - friction;
    } else {
      if (minO === overlapT) {
        y = c.top - hh;
        outVy *= -elasticity;
      } else {
        y = c.bottom + hh;
        outVy *= -elasticity;
      }
      outVx *= 1 - friction;
    }

    const cl = x - hw;
    const cr = x + hw;
    const ct = y - hh;
    const cb = y + hh;
    if (cr <= c.left || cl >= c.right || cb <= c.top || ct >= c.bottom) continue;
  }

  return { x, y, vx: outVx, vy: outVy };
}
