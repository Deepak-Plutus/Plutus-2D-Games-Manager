import { BaseBehavior } from './BaseBehavior.js';
import { COMPONENT_TRANSFORM } from '../Components/index.js';
import { lineOfSightBehaviorDefaults } from './Config/lineOfSightBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/line-of-sight
 */
export class LineOfSightBehavior extends BaseBehavior {
  static type = 'lineOfSight';
  static priority = 35;

  static defaultProperties = { ...lineOfSightBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._hadLos = null;
    /** @private @type {Set<string>} */
    this._customObstacleSet = new Set();
    this._syncCustomObstacleSet();
  }

  _syncCustomObstacleSet() {
    const arr = Array.isArray(this.customObstacleNames) ? this.customObstacleNames : [];
    this._customObstacleSet = new Set(arr.map(String));
  }

  applyJsonProperties(json) {
    if (json.targetName != null) this.targetName = String(json.targetName);
    if (json.range != null) this.range = Number(json.range);
    if (json.rayStep != null) this.rayStep = Number(json.rayStep);
    if (json.coneOfView != null) this.coneOfView = Number(json.coneOfView);
    if (json.obstacles != null) {
      this.obstacles = String(json.obstacles).toLowerCase() === 'custom' ? 'custom' : 'solids';
    }
    if (Array.isArray(json.customObstacleNames)) {
      this.customObstacleNames = json.customObstacleNames.map(String);
    }
    this._syncCustomObstacleSet();
  }

  setTargetName(name) {
    this.targetName = String(name);
  }

  /** Runtime: block LOS on colliders whose entity `meta.name` matches. */
  addObstacleObjectName(name) {
    const s = String(name);
    this._customObstacleSet.add(s);
    if (!this.customObstacleNames.includes(s)) this.customObstacleNames.push(s);
  }

  /** Clears custom obstacle names (Construct-style clear obstacles). */
  clearObstacles() {
    this.customObstacleNames = [];
    this._customObstacleSet.clear();
  }

  get hasLineOfSight() {
    return this._hadLos === true;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled() || !this.targetName) return;
    const { transform, world, events, entityId, colliders } = ctx;
    const tid = world?.findEntityIdByMetaName(this.targetName);
    let has = false;

    if (tid != null && world) {
      const ttr = world.getComponent(tid, COMPONENT_TRANSFORM);
      if (ttr) {
        const dx = ttr.x - transform.x;
        const dy = ttr.y - transform.y;
        const d = Math.hypot(dx, dy);
        if (d <= this.range && d > 0.001) {
          const coneDeg = Math.max(0, this.coneOfView);
          const inCone =
            coneDeg >= 360 ||
            inConeOfView(transform.x, transform.y, transform.rotation, ttr.x, ttr.y, coneDeg);
          if (inCone) {
            const blocked = rayBlocked(
              transform.x,
              transform.y,
              ttr.x,
              ttr.y,
              this.rayStep,
              colliders ?? [],
              entityId,
              world,
              this.obstacles,
              this._customObstacleSet,
            );
            has = !blocked;
          }
        }
      }
    }

    if (has !== this._hadLos) {
      this._hadLos = has;
      events?.emit('lineOfSight:changed', { entityId, hasLos: has, targetName: this.targetName });
    }
  }
}

/**
 * Forward from `rotation` (radians): (cos, sin). Half-angle in radians.
 */
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

/**
 * @param {import('../Core/CollisionService.js').ColliderAabb[]} colliders
 * @param {import('../ECS/World.js').World} world
 * @param {'solids'|'custom'} mode
 * @param {Set<string>} customSet
 */
function rayBlocked(x0, y0, x1, y1, step, colliders, selfId, world, mode, customSet) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(d / Math.max(step, 1)));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    for (const c of colliders) {
      if (c.entityId === selfId) continue;
      if (!colliderBlocksLos(c, world, mode, customSet)) continue;
      if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) return true;
    }
  }
  return false;
}

/**
 * @param {import('../Core/CollisionService.js').ColliderAabb} c
 */
function colliderBlocksLos(c, world, mode, customSet) {
  if (mode === 'solids') return c.kind === 'solid';
  const name = world.getMetaName(c.entityId);
  return name != null && customSet.has(name);
}
