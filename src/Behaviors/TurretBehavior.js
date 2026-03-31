import { BaseBehavior } from './BaseBehavior.js';
import { COMPONENT_META, COMPONENT_TRANSFORM } from '../Components/index.js';
import { turretBehaviorDefaults } from './Config/turretBehaviorConfig.js';

const DEG = Math.PI / 180;

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/turret
 */
export class TurretBehavior extends BaseBehavior {
  static type = 'turret';
  static priority = 32;

  static defaultProperties = { ...turretBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private @type {Set<string>} */
    this._targetNames = new Set();
    /** @private */
    this._currentTargetId = null;
    /** @private */
    this._fireCooldown = 0;
    /** @private @type {Map<number, { x: number, y: number }>} */
    this._lastPos = new Map();
  }

  applyJsonProperties(json) {
    if (json.range != null) this.range = Number(json.range);
    if (json.rateOfFire != null) this.rateOfFire = Number(json.rateOfFire);
    if (json.rotate != null) this.rotate = !!json.rotate;
    if (json.rotateSpeed != null) this.rotateSpeed = Number(json.rotateSpeed);
    if (json.targetMode != null) this.targetMode = String(json.targetMode).toLowerCase();
    if (json.predictiveAim != null) this.predictiveAim = !!json.predictiveAim;
    if (json.projectileSpeed != null) this.projectileSpeed = Number(json.projectileSpeed);
    if (json.useCollisionCells != null) this.useCollisionCells = !!json.useCollisionCells;
    if (json.aimToleranceDeg != null) this.aimToleranceDeg = Number(json.aimToleranceDeg);
    if (Array.isArray(json.targetNames)) {
      for (const n of json.targetNames) this.addObjectToTarget(String(n));
    }
  }

  addObjectToTarget(name) {
    this._targetNames.add(String(name));
  }

  clearTargets() {
    this._targetNames.clear();
    this._currentTargetId = null;
  }

  unacquireTarget() {
    this._currentTargetId = null;
    this._fireCooldown = 0;
  }

  /**
   * @param {string} name meta.name
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  acquireTargetObjectByName(name, ctx) {
    const { world, transform } = ctx;
    if (!world) return;
    const tid = world.findEntityIdByMetaName(name);
    if (tid == null) return;
    const ttr = world.getComponent(tid, COMPONENT_TRANSFORM);
    if (!ttr) return;
    const d = Math.hypot(ttr.x - transform.x, ttr.y - transform.y);
    if (d > this.range) return;
    this._currentTargetId = tid;
  }

  setRange(v) {
    this.range = Number(v);
  }

  setRateOfFire(v) {
    this.rateOfFire = Number(v);
  }

  setRotate(v) {
    this.rotate = !!v;
  }

  setRotateSpeed(v) {
    this.rotateSpeed = Number(v);
  }

  setTargetMode(mode) {
    this.targetMode = String(mode).toLowerCase();
  }

  setPredictiveAim(v) {
    this.predictiveAim = !!v;
  }

  setProjectileSpeed(v) {
    this.projectileSpeed = Number(v);
  }

  setEnabled(value) {
    super.setEnabled(value);
    if (!value) {
      this._currentTargetId = null;
      this._fireCooldown = 0;
    }
  }

  get hasTarget() {
    return this._currentTargetId != null;
  }

  /** Construct UID → our entity id */
  get TargetUID() {
    return this._currentTargetId ?? -1;
  }

  get RateOfFire() {
    return this.rateOfFire;
  }

  get RotateSpeed() {
    return this.rotateSpeed;
  }

  get Range() {
    return this.range;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled() || !ctx.world) return;
    const { world, transform, dt, entityId, events } = ctx;
    const selfId = entityId;

    const candidates = collectTargets(world, this._targetNames, selfId, transform.x, transform.y, this.range);

    if (this._currentTargetId != null) {
      const still = candidates.find((c) => c.id === this._currentTargetId);
      const inRange = still && still.d <= this.range;
      if (!inRange) {
        this._currentTargetId = null;
        this._fireCooldown = 0;
      } else if (this.targetMode === 'nearest' && candidates.length) {
        candidates.sort((a, b) => a.d - b.d);
        if (candidates[0].id !== this._currentTargetId) {
          this._currentTargetId = candidates[0].id;
          events?.emit('turret:targetAcquired', { entityId: selfId, targetId: this._currentTargetId });
        }
      }
    }

    if (this._currentTargetId == null && candidates.length) {
      if (this.targetMode === 'nearest') candidates.sort((a, b) => a.d - b.d);
      this._currentTargetId = candidates[0].id;
      events?.emit('turret:targetAcquired', { entityId: selfId, targetId: this._currentTargetId });
    }

    if (this._currentTargetId == null) {
      this._fireCooldown = 0;
      return;
    }

    const ttr = world.getComponent(this._currentTargetId, COMPONENT_TRANSFORM);
    if (!ttr) {
      this._currentTargetId = null;
      return;
    }

    let aimX = ttr.x;
    let aimY = ttr.y;

    if (this.predictiveAim && this.projectileSpeed > 1) {
      const prev = this._lastPos.get(this._currentTargetId);
      let tvx = 0;
      let tvy = 0;
      if (prev) {
        tvx = (ttr.x - prev.x) / Math.max(dt, 1e-6);
        tvy = (ttr.y - prev.y) / Math.max(dt, 1e-6);
      }
      this._lastPos.set(this._currentTargetId, { x: ttr.x, y: ttr.y });
      const dist = Math.hypot(ttr.x - transform.x, ttr.y - transform.y);
      const tFlight = dist / this.projectileSpeed;
      aimX = ttr.x + tvx * tFlight;
      aimY = ttr.y + tvy * tFlight;
    } else {
      this._lastPos.set(this._currentTargetId, { x: ttr.x, y: ttr.y });
    }

    const wantAngle = Math.atan2(aimY - transform.y, aimX - transform.x);
    if (this.rotate) {
      const maxStep = this.rotateSpeed * DEG * dt;
      transform.rotation = rotateToward(transform.rotation, wantAngle, maxStep);
    }

    const diff = Math.abs(angleDelta(transform.rotation, wantAngle));
    const tol = this.aimToleranceDeg * DEG;
    const aimed = !this.rotate || diff <= tol;

    if (aimed && this.rateOfFire > 0) {
      const interval = 1 / this.rateOfFire;
      this._fireCooldown -= dt;
      if (this._fireCooldown <= 0) {
        this._fireCooldown = interval;
        events?.emit('turret:shoot', {
          entityId: selfId,
          targetId: this._currentTargetId,
          angle: transform.rotation,
        });
      }
    } else {
      this._fireCooldown = 0;
    }
  }
}

/**
 * @param {import('../ECS/World.js').World} world
 * @param {Set<string>} names
 */
function collectTargets(world, names, selfId, sx, sy, range) {
  /** @type {{ id: number, d: number }[]} */
  const out = [];
  if (!names.size) return out;
  for (const e of world.entities.values()) {
    if (e.id === selfId) continue;
    const meta = world.getComponent(e.id, COMPONENT_META);
    const n = meta?.name != null ? String(meta.name) : null;
    if (!n || !names.has(n)) continue;
    const tr = world.getComponent(e.id, COMPONENT_TRANSFORM);
    if (!tr) continue;
    const d = Math.hypot(tr.x - sx, tr.y - sy);
    if (d <= range) out.push({ id: e.id, d });
  }
  return out;
}

function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function rotateToward(current, target, maxStep) {
  const d = angleDelta(current, target);
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}
