import { BaseBehavior } from './BaseBehavior.js';
import { bulletBehaviorDefaults } from './Config/bulletBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/bullet
 */
export class BulletBehavior extends BaseBehavior {
  static type = 'bullet';
  static priority = 12;

  static defaultProperties = { ...bulletBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._vx = 0;
    /** @private */
    this._vy = 0;
    /** @private */
    this._distanceTravelled = 0;
    this._syncFromAngleSpeed();
  }

  applyJsonProperties(json) {
    if (json.speed != null) this.speed = Number(json.speed);
    if (json.angle != null) this.angle = Number(json.angle);
    if (json.acceleration != null) this.acceleration = Number(json.acceleration);
    if (json.gravity != null) this.gravity = Number(json.gravity);
    if (json.bounceOffSolids != null) this.bounceOffSolids = !!json.bounceOffSolids;
    if (json.bounceDamping != null) this.bounceDamping = Number(json.bounceDamping);
    if (json.destroyOnSolid != null) this.destroyOnSolid = !!json.destroyOnSolid;
    if (json.resetDistanceOnEnable != null) this.resetDistanceOnEnable = !!json.resetDistanceOnEnable;
    this._syncFromAngleSpeed();
  }

  setEnabled(value) {
    const next = !!value;
    if (next && !this.enabled && this.resetDistanceOnEnable) this._distanceTravelled = 0;
    super.setEnabled(next);
  }

  get distanceTravelled() {
    return this._distanceTravelled;
  }

  resetDistanceTravelled() {
    this._distanceTravelled = 0;
  }

  _syncFromAngleSpeed() {
    const rad = (this.angle * Math.PI) / 180;
    this._vx = Math.cos(rad) * this.speed;
    this._vy = Math.sin(rad) * this.speed;
  }

  get vectorX() {
    return this._vx;
  }

  get vectorY() {
    return this._vy;
  }

  setSpeed(s) {
    this.speed = Number(s);
    const sp = Math.hypot(this._vx, this._vy) || 1;
    const scale = this.speed / sp;
    this._vx *= scale;
    this._vy *= scale;
  }

  setAngleOfMotion(deg) {
    this.angle = Number(deg);
    const sp = Math.hypot(this._vx, this._vy);
    const rad = (this.angle * Math.PI) / 180;
    this._vx = Math.cos(rad) * sp;
    this._vy = Math.sin(rad) * sp;
  }

  setAcceleration(a) {
    this.acceleration = Number(a);
  }

  setGravity(g) {
    this.gravity = Number(g);
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, dt, colliders, events, entityId, world } = ctx;

    if (this.acceleration !== 0) {
      const sp = Math.hypot(this._vx, this._vy) || 1;
      const nx = this._vx / sp;
      const ny = this._vy / sp;
      this._vx += nx * this.acceleration * dt;
      this._vy += ny * this.acceleration * dt;
    }

    this._vy += this.gravity * dt;

    let nx = transform.x + this._vx * dt;
    let ny = transform.y + this._vy * dt;
    this._distanceTravelled += Math.hypot(nx - transform.x, ny - transform.y);

    if (colliders?.length) {
      const hit = sampleSegment(transform.x, transform.y, nx, ny, colliders, entityId);
      if (hit) {
        events?.emit('bullet:hit', {
          entityId,
          colliderEntityId: hit.collider.entityId,
          kind: hit.collider.kind,
        });
        if (this.destroyOnSolid) {
          world?.destroyEntity(entityId);
          return;
        }
        if (this.bounceOffSolids) {
          const b = hit.collider;
          const dx = nx - transform.x;
          const dy = ny - transform.y;
          const dist = Math.hypot(dx, dy) || 1;
          const nearX = transform.x + (dx / dist) * hit.t * dist;
          const nearY = transform.y + (dy / dist) * hit.t * dist;
          const flipX = Math.abs(nearX - (b.left + b.right) / 2) > Math.abs(nearY - (b.top + b.bottom) / 2);
          if (flipX) this._vx *= -this.bounceDamping;
          else this._vy *= -this.bounceDamping;
          nx = transform.x + this._vx * dt;
          ny = transform.y + this._vy * dt;
        }
      }
    }

    transform.x = nx;
    transform.y = ny;
    transform.rotation = Math.atan2(this._vy, this._vx);
  }
}

/**
 * @param {import('../Core/CollisionService.js').ColliderAabb[]} colliders
 */
function sampleSegment(x0, y0, x1, y1, colliders, selfId) {
  const steps = 8;
  let best = null;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (const c of colliders) {
      if (c.entityId === selfId) continue;
      if (c.kind !== 'solid') continue;
      if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) {
        if (!best || t < best.t) best = { t, collider: c };
      }
    }
  }
  return best;
}
