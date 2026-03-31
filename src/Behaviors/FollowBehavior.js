import { BaseBehavior } from './BaseBehavior.js';
import { COMPONENT_DISPLAY, COMPONENT_TRANSFORM } from '../Components/index.js';
import { followBehaviorDefaults } from './Config/followBehaviorConfig.js';

/**
 * @typedef {{ t: number, x: number, y: number, rotation: number, width: number, height: number, alpha: number, visible: boolean }} FollowSample
 */

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/follow
 */
export class FollowBehavior extends BaseBehavior {
  static type = 'follow';
  static priority = 22;

  static defaultProperties = { ...followBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private @type {FollowSample[]} */
    this._entries = [];
    /** @private */
    this._histAcc = 0;
  }

  applyJsonProperties(json) {
    if (json.targetName != null) this.targetName = String(json.targetName);
    if (json.historyRate != null) this.historyRate = Number(json.historyRate);
    if (json.historyMaxEntries != null) this.historyMaxEntries = Number(json.historyMaxEntries);
    if (json.followDelay != null) this.followDelay = Number(json.followDelay);
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed);
    if (json.stopDistance != null) this.stopDistance = Number(json.stopDistance);
    if (json.rotateToward != null) this.rotateToward = !!json.rotateToward;
    if (json.followSelf != null) this.followSelf = !!json.followSelf;
    if (json.following != null) this.following = !!json.following;
    if (json.followX != null) this.followX = !!json.followX;
    if (json.followY != null) this.followY = !!json.followY;
    if (json.followWidth != null) this.followWidth = !!json.followWidth;
    if (json.followHeight != null) this.followHeight = !!json.followHeight;
    if (json.followAngle != null) this.followAngle = !!json.followAngle;
    if (json.followOpacity != null) this.followOpacity = !!json.followOpacity;
    if (json.followVisibility != null) this.followVisibility = !!json.followVisibility;
    if (json.followDestroyed != null) this.followDestroyed = !!json.followDestroyed;
    this.historyMaxEntries = Math.min(10, Math.max(1, Math.floor(Number(this.historyMaxEntries)) || 10));
  }

  /** Follow this instance’s own delayed trail (Construct: follow self). */
  followSelfMode() {
    this.followSelf = true;
    this.targetName = '';
    this.following = true;
  }

  followObjectByName(name) {
    this.followSelf = false;
    this.targetName = String(name);
    this.following = true;
  }

  stopFollowing() {
    this.following = false;
  }

  clearHistory() {
    this._entries.length = 0;
    this._histAcc = 0;
  }

  /**
   * @param {string} prop `x` | `y` | `width` | `height` | `angle` | `opacity` | `visibility` | `destroyed`
   */
  followProperty(prop) {
    const key = String(prop).toLowerCase().trim();
    if (key === 'x') this.followX = true;
    else if (key === 'y') this.followY = true;
    else if (key === 'width') this.followWidth = true;
    else if (key === 'height') this.followHeight = true;
    else if (key === 'angle') this.followAngle = true;
    else if (key === 'opacity') this.followOpacity = true;
    else if (key === 'visibility') this.followVisibility = true;
    else if (key === 'destroyed') this.followDestroyed = true;
  }

  /**
   * @param {string} prop
   */
  stopFollowingProperty(prop) {
    const key = String(prop).toLowerCase().trim();
    if (key === 'x') this.followX = false;
    else if (key === 'y') this.followY = false;
    else if (key === 'width') this.followWidth = false;
    else if (key === 'height') this.followHeight = false;
    else if (key === 'angle') this.followAngle = false;
    else if (key === 'opacity') this.followOpacity = false;
    else if (key === 'visibility') this.followVisibility = false;
    else if (key === 'destroyed') this.followDestroyed = false;
  }

  setTargetName(name) {
    this.targetName = String(name);
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled() || !this.following) return;
    const { transform, world, dt, entityId, displayView, time: gameTime = 0 } = ctx;
    if (!world) return;

    const sourceId = this.followSelf ? entityId : world.findEntityIdByMetaName(this.targetName);

    if (sourceId == null) {
      if (this.followDestroyed && !this.followSelf) {
        world.destroyEntity(entityId);
      }
      return;
    }

    const interval = 1 / Math.max(this.historyRate, 0.001);
    this._histAcc += dt;
    if (this._histAcc >= interval) {
      this._histAcc -= interval;
      const snap = captureSnapshot(sourceId, world, gameTime);
      if (snap) this._pushEntry(snap);
    }

    const delayedT = gameTime - Math.max(0, this.followDelay);
    const sample = sampleHistory(this._entries, delayedT);
    if (!sample) return;

    if (this.followX || this.followY) {
      const tx = this.followX ? sample.x : transform.x;
      const ty = this.followY ? sample.y : transform.y;
      const dx = tx - transform.x;
      const dy = ty - transform.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.stopDistance) {
        if (this.maxSpeed > 0 && dist > 0.001) {
          const step = Math.min(this.maxSpeed * dt, dist);
          transform.x += (dx / dist) * step;
          transform.y += (dy / dist) * step;
        } else {
          if (this.followX) transform.x = tx;
          if (this.followY) transform.y = ty;
        }
      }
      if (this.rotateToward) {
        const rdx = tx - transform.x;
        const rdy = ty - transform.y;
        if (Math.hypot(rdx, rdy) > 0.02) transform.rotation = Math.atan2(rdy, rdx);
      }
    }

    if (this.followAngle) {
      const blend = this.maxSpeed > 0 ? Math.min(1, (this.maxSpeed * dt) / 120) : 1;
      transform.rotation = lerpAngleRad(transform.rotation, sample.rotation, blend);
    }

    if (displayView) {
      if (this.followWidth) {
        if (this.maxSpeed > 0)
          displayView.width = moveToward(displayView.width, sample.width, this.maxSpeed * dt);
        else displayView.width = sample.width;
      }
      if (this.followHeight) {
        if (this.maxSpeed > 0)
          displayView.height = moveToward(displayView.height, sample.height, this.maxSpeed * dt);
        else displayView.height = sample.height;
      }
      if (this.followOpacity) {
        const a = displayView.alpha ?? 1;
        if (this.maxSpeed > 0) displayView.alpha = moveToward(a, sample.alpha, this.maxSpeed * dt * 0.01);
        else displayView.alpha = sample.alpha;
      }
      if (this.followVisibility) displayView.visible = sample.visible;
    }
  }

  /**
   * @param {FollowSample} s
   */
  _pushEntry(s) {
    this._entries.push(s);
    const cap = Math.min(10, Math.max(1, Math.floor(this.historyMaxEntries) || 10));
    while (this._entries.length > cap) this._entries.shift();
  }
}

/**
 * @param {number} eid
 * @param {import('../ECS/World.js').World} world
 * @param {number} t
 * @returns {FollowSample | null}
 */
function captureSnapshot(eid, world, t) {
  const tr = world.getComponent(eid, COMPONENT_TRANSFORM);
  if (!tr) return null;
  const disp = world.getComponent(eid, COMPONENT_DISPLAY);
  const v = disp?.view;
  return {
    t,
    x: tr.x,
    y: tr.y,
    rotation: tr.rotation,
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    alpha: v?.alpha ?? 1,
    visible: v?.visible !== false,
  };
}

/**
 * @param {FollowSample[]} entries
 * @param {number} targetT
 * @returns {FollowSample | null}
 */
function sampleHistory(entries, targetT) {
  if (entries.length === 0) return null;
  if (targetT <= entries[0].t) return entries[0];
  const last = entries[entries.length - 1];
  if (targetT >= last.t) return last;
  for (let i = 0; i < entries.length - 1; i++) {
    const a = entries[i];
    const b = entries[i + 1];
    if (targetT >= a.t && targetT <= b.t) {
      const u = (targetT - a.t) / (b.t - a.t || 1e-9);
      return lerpSample(a, b, u);
    }
  }
  return last;
}

/**
 * @param {FollowSample} a
 * @param {FollowSample} b
 * @param {number} u
 * @returns {FollowSample}
 */
function lerpSample(a, b, u) {
  return {
    t: a.t + (b.t - a.t) * u,
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    rotation: lerpAngleRad(a.rotation, b.rotation, u),
    width: a.width + (b.width - a.width) * u,
    height: a.height + (b.height - a.height) * u,
    alpha: a.alpha + (b.alpha - a.alpha) * u,
    visible: u < 0.5 ? a.visible : b.visible,
  };
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t 0..1
 */
function lerpAngleRad(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
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
