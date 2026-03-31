import { BaseBehavior } from './BaseBehavior.js';
import { COMPONENT_TRANSFORM } from '../Components/index.js';
import { orbitBehaviorDefaults } from './Config/orbitBehaviorConfig.js';

const DEG = Math.PI / 180;

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/orbit
 */
export class OrbitBehavior extends BaseBehavior {
  static type = 'orbit';
  static priority = 25;

  static defaultProperties = { ...orbitBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._speedCurrent = this.speed;
    /** @private */
    this._orbitAngleDeg = 0;
    /** @private */
    this._totalRotationDeg = 0;
    /** @private */
    this._absTotalRotationDeg = 0;
    /** @private */
    this._prevOrbitAngleDeg = 0;
    /** @private */
    this._hasCenter = this.centerX != null && this.centerY != null;
    /** @private */
    this._cx = 0;
    /** @private */
    this._cy = 0;
    /** @private */
    this._lastDist = 0;
    if (this._hasCenter) {
      this.centerX = Number(this.centerX);
      this.centerY = Number(this.centerY);
    }
  }

  applyJsonProperties(json) {
    if (json.speed != null) {
      this.speed = Number(json.speed);
      this._speedCurrent = this.speed;
    }
    if (json.acceleration != null) this.acceleration = Number(json.acceleration);
    if (json.primaryRadius != null) this.primaryRadius = Number(json.primaryRadius);
    if (json.secondaryRadius != null) this.secondaryRadius = Number(json.secondaryRadius);
    if (json.offsetAngle != null) this.offsetAngle = Number(json.offsetAngle);
    if (json.matchRotation != null) this.matchRotation = !!json.matchRotation;
    if (json.centerX != null) {
      this.centerX = Number(json.centerX);
      this._hasCenter = true;
    }
    if (json.centerY != null) {
      this.centerY = Number(json.centerY);
      this._hasCenter = true;
    }
    if (json.pinnedTargetName != null) this.pinnedTargetName = String(json.pinnedTargetName);
  }

  pinToObjectByName(name) {
    this.pinnedTargetName = String(name);
  }

  unpin() {
    this.pinnedTargetName = '';
  }

  setAcceleration(a) {
    this.acceleration = Number(a);
  }

  setMatchRotation(v) {
    this.matchRotation = !!v;
  }

  setOffsetAngle(deg) {
    this.offsetAngle = Number(deg);
  }

  setRadius(primary, secondary) {
    this.primaryRadius = Number(primary);
    this.secondaryRadius = Number(secondary != null ? secondary : primary);
  }

  setSpeed(s) {
    this.speed = Number(s);
    this._speedCurrent = this.speed;
  }

  setRotation(deg) {
    this._orbitAngleDeg = Number(deg);
    this._prevOrbitAngleDeg = this._orbitAngleDeg;
  }

  setTarget(x, y) {
    this.centerX = Number(x);
    this.centerY = Number(y);
    this._hasCenter = true;
  }

  resetTotalRotation() {
    this._totalRotationDeg = 0;
    this._absTotalRotationDeg = 0;
  }

  get DistanceToTarget() {
    return this._lastDist;
  }
  get Rotation() {
    return this._orbitAngleDeg;
  }
  get TargetX() {
    return this._cx;
  }
  get TargetY() {
    return this._cy;
  }
  get TotalRotation() {
    return this._totalRotationDeg;
  }
  get TotalAbsoluteRotation() {
    return this._absTotalRotationDeg;
  }

  get Acceleration() {
    return this.acceleration;
  }
  get OffsetAngle() {
    return this.offsetAngle;
  }
  get PrimaryRadius() {
    return this.primaryRadius;
  }
  get SecondaryRadius() {
    return this.secondaryRadius;
  }
  get Speed() {
    return this.speed;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, world, dt } = ctx;

    let cx = this.centerX;
    let cy = this.centerY;
    if (this.pinnedTargetName && world) {
      const tid = world.findEntityIdByMetaName(this.pinnedTargetName);
      if (tid != null) {
        const ttr = world.getComponent(tid, COMPONENT_TRANSFORM);
        if (ttr) {
          cx = ttr.x;
          cy = ttr.y;
          this._hasCenter = true;
        }
      }
    } else if (!this._hasCenter) {
      cx = transform.x;
      cy = transform.y;
      this.centerX = cx;
      this.centerY = cy;
      this._hasCenter = true;
    }

    this._cx = cx;
    this._cy = cy;

    this._speedCurrent += this.acceleration * dt;
    const deltaDeg = this._speedCurrent * dt;
    this._orbitAngleDeg += deltaDeg;
    this._totalRotationDeg += deltaDeg;
    this._absTotalRotationDeg += Math.abs(deltaDeg);

    const prevA = this._prevOrbitAngleDeg * DEG;
    const curA = this._orbitAngleDeg * DEG;
    const off = this.offsetAngle * DEG;
    const a = this.primaryRadius;
    const b = this.secondaryRadius;

    const x1 = a * Math.cos(curA) * Math.cos(off) - b * Math.sin(curA) * Math.sin(off);
    const y1 = a * Math.cos(curA) * Math.sin(off) + b * Math.sin(curA) * Math.cos(off);

    transform.x = cx + x1;
    transform.y = cy + y1;
    this._lastDist = Math.hypot(transform.x - cx, transform.y - cy);

    if (this.matchRotation) {
      const x0 = a * Math.cos(prevA) * Math.cos(off) - b * Math.sin(prevA) * Math.sin(off);
      const y0 = a * Math.cos(prevA) * Math.sin(off) + b * Math.sin(prevA) * Math.cos(off);
      const tdx = x1 - x0;
      const tdy = y1 - y0;
      if (Math.hypot(tdx, tdy) > 1e-6) transform.rotation = Math.atan2(tdy, tdx);
    }

    this._prevOrbitAngleDeg = this._orbitAngleDeg;
  }
}
