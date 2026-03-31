import { BaseBehavior } from './BaseBehavior.js';
import { COMPONENT_TRANSFORM } from '../Components/index.js';
import { patrolChaseBehaviorDefaults } from './Config/patrolChaseBehaviorConfig.js';

/**
 * `ground`: patrol and chase only on **X** (Y locked to spawn). `fly`: **horizontal** patrol at fixed Y;
 * when chasing, moves in **2D** toward the target.
 */
export class PatrolChaseBehavior extends BaseBehavior {
  static type = 'patrolChase';
  static priority = 18;

  static defaultProperties = { ...patrolChaseBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._dir = 1;
    /** @private */
    this._spawnX = null;
    /** @private */
    this._spawnY = null;
    /** @private */
    this._vy = 0;
  }

  applyJsonProperties(json) {
    if (json.targetName != null) this.targetName = String(json.targetName);
    if (json.enableChase != null) this.enableChase = !!json.enableChase;
    if (json.mode != null) this.mode = String(json.mode).toLowerCase();
    if (json.patrolSpeed != null) this.patrolSpeed = Number(json.patrolSpeed);
    if (json.chaseSpeed != null) this.chaseSpeed = Number(json.chaseSpeed);
    if (json.losRange != null) this.losRange = Number(json.losRange);
    if (json.rayStep != null) this.rayStep = Number(json.rayStep);
    if (json.coneOfView != null) this.coneOfView = Number(json.coneOfView);
    if (json.patrolMinX != null) this.patrolMinX = Number(json.patrolMinX);
    if (json.patrolMaxX != null) this.patrolMaxX = Number(json.patrolMaxX);
    if (json.ampX != null) this.ampX = Number(json.ampX);
    if (json.ampY != null) this.ampY = Number(json.ampY);
    if (json.patrolPeriod != null) this.patrolPeriod = Number(json.patrolPeriod);
    if (json.gravity != null) this.gravity = Number(json.gravity);
    if (json.maxFallSpeed != null) this.maxFallSpeed = Number(json.maxFallSpeed);
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled() || !ctx.world) return;
    const { transform, dt, colliders, entityId, time } = ctx;
    const list = colliders ?? [];
    const self = list.find((c) => c.entityId === entityId);
    const tid = this.enableChase && this.targetName ? ctx.world.findEntityIdByMetaName(this.targetName) : null;
    const ttr = tid != null ? ctx.world.getComponent(tid, COMPONENT_TRANSFORM) : null;

    if (this._spawnX == null) {
      this._spawnX = transform.x;
      this._spawnY = transform.y;
      if (this.mode === 'ground' && this.patrolMinX === 0 && this.patrolMaxX === 0) {
        this.patrolMinX = transform.x - 80;
        this.patrolMaxX = transform.x + 80;
      }
    }

    let chasing = false;
    if (ttr) {
      const dx0 = ttr.x - transform.x;
      const dy0 = ttr.y - transform.y;
      const dist = Math.hypot(dx0, dy0);
      if (dist <= this.losRange && dist > 0.5) {
        const coneDeg = Math.max(0, this.coneOfView);
        const inCone =
          coneDeg >= 360 ||
          inConeOfView(transform.x, transform.y, transform.rotation, ttr.x, ttr.y, coneDeg);
        if (inCone && !rayBlockedSolids(transform.x, transform.y, ttr.x, ttr.y, this.rayStep, list, entityId)) {
          chasing = true;
          if (this.mode === 'fly') {
            const step = Math.min(this.chaseSpeed * dt, dist);
            transform.x += (dx0 / dist) * step;
            transform.y += (dy0 / dist) * step;
            transform.scaleX = dx0 >= 0 ? 1 : -1;
            transform.rotation = 0;
          } else {
            const hdist = Math.abs(dx0);
            if (hdist > 0.5) {
              const step = Math.min(this.chaseSpeed * dt, hdist);
              transform.x += Math.sign(dx0) * step;
            }
            transform.y = this._spawnY;
            transform.scaleX = dx0 >= 0 ? 1 : -1;
            transform.rotation = 0;
          }
        }
      }
    }

    if (chasing) return;

    if (this.mode === 'fly') {
      const p = Math.max(0.4, this.patrolPeriod);
      const t = time * ((Math.PI * 2) / p);
      transform.x = this._spawnX + Math.cos(t) * this.ampX;
      transform.y = this._spawnY;
      if (ttr) {
        const adx = ttr.x - transform.x;
        transform.scaleX = adx >= 0 ? 1 : -1;
        transform.rotation = 0;
      }
      return;
    }

    const minX = Math.min(this.patrolMinX, this.patrolMaxX);
    const maxX = Math.max(this.patrolMinX, this.patrolMaxX);
    let vx = this._dir * this.patrolSpeed;
    const nextByPatrol = transform.x + vx * dt;
    if (nextByPatrol <= minX) {
      this._dir = 1;
      vx = Math.abs(vx);
    } else if (nextByPatrol >= maxX) {
      this._dir = -1;
      vx = -Math.abs(vx);
    }

    if (self) {
      const hw = (self.right - self.left) / 2;
      const hh = (self.bottom - self.top) / 2;
      const prevX = transform.x;
      let nextX = transform.x + vx * dt;
      for (const c of list) {
        if (c.entityId === entityId || c.kind !== 'solid') continue;
        const top = transform.y - hh;
        const bottom = transform.y + hh;
        if (bottom <= c.top || top >= c.bottom) continue;
        const prevLeft = prevX - hw;
        const prevRight = prevX + hw;
        const nextLeft = nextX - hw;
        const nextRight = nextX + hw;
        if (vx > 0 && prevRight <= c.left && nextRight >= c.left) {
          nextX = c.left - hw;
          this._dir = -1;
          vx = -Math.abs(vx);
        } else if (vx < 0 && prevLeft >= c.right && nextLeft <= c.right) {
          nextX = c.right + hw;
          this._dir = 1;
          vx = Math.abs(vx);
        }
      }
      transform.x = nextX;

      const prevY = transform.y;
      this._vy = Math.min(this.maxFallSpeed, this._vy + this.gravity * dt);
      let nextY = transform.y + this._vy * dt;
      const prevFeet = prevY + hh;
      const nextFeet = nextY + hh;
      for (const c of list) {
        if (c.entityId === entityId) continue;
        const active = c.kind === 'solid' || (c.kind === 'jumpThru' && this._vy > 0);
        if (!active) continue;
        const left = transform.x - hw;
        const right = transform.x + hw;
        if (right <= c.left || left >= c.right) continue;
        if (this._vy >= 0 && prevFeet <= c.top + 2 && nextFeet >= c.top - 1) {
          nextY = c.top - hh;
          this._vy = 0;
          break;
        }
      }
      transform.y = nextY;
    } else {
      transform.x += vx * dt;
    }
    transform.scaleX = vx >= 0 ? 1 : -1;
    transform.rotation = 0;
  }
}

/**
 * @param {import('../Core/CollisionService.js').ColliderAabb[]} colliders
 */
function rayBlockedSolids(x0, y0, x1, y1, step, colliders, selfId) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / Math.max(step, 1)));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (const c of colliders) {
      if (c.entityId === selfId) continue;
      if (c.kind !== 'solid') continue;
      if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) return true;
    }
  }
  return false;
}

function inConeOfView(ax, ay, forwardRad, tx, ty, coneDeg) {
  const half = ((coneDeg / 2) * Math.PI) / 180;
  const fx = Math.cos(forwardRad);
  const fy = Math.sin(forwardRad);
  const vx = tx - ax;
  const vy = ty - ay;
  const len = Math.hypot(vx, vy);
  if (len < 1e-6) return true;
  const nx = vx / len;
  const ny = vy / len;
  const dot = Math.max(-1, Math.min(1, fx * nx + fy * ny));
  const ang = Math.acos(dot);
  return ang <= half + 1e-5;
}
