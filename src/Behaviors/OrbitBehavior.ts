import { BaseBehavior } from './BaseBehavior.js'
import { COMPONENT_TRANSFORM } from '../Components/index.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { orbitBehaviorDefaults } from './Config/orbitBehaviorConfig.js'

const DEG = Math.PI / 180
type JsonRecord = Record<string, unknown>

/**
 * Elliptical orbit behavior around a fixed center or pinned target.
 *
 * Optionally aligns entity rotation to orbit tangent direction.
 */
export class OrbitBehavior extends BaseBehavior {
  static type = 'orbit'
  static priority = 25
  static defaultProperties = { ...orbitBehaviorDefaults }

  speed = 45
  acceleration = 0
  primaryRadius = 100
  secondaryRadius = 100
  offsetAngle = 0
  matchRotation = true
  centerX: number | null = null
  centerY: number | null = null
  pinnedTargetName = ''
  private _speedCurrent = this.speed
  private _orbitAngleDeg = 0
  private _prevOrbitAngleDeg = 0
  private _hasCenter = false

  /**
   * Creates orbit behavior and seeds center/speed state.
   *
   * @param {JsonRecord} json Raw behavior config.
   * @returns {void} Nothing.
   */
  constructor (json: JsonRecord = {}) {
    super(json)
    this._speedCurrent = this.speed
    this._hasCenter = this.centerX != null && this.centerY != null
  }

  /**
   * Applies orbit parameters from JSON.
   *
   * @param {JsonRecord} json Raw behavior config.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.speed != null) { this.speed = Number(json.speed); this._speedCurrent = this.speed }
    if (json.acceleration != null) this.acceleration = Number(json.acceleration)
    if (json.primaryRadius != null) this.primaryRadius = Number(json.primaryRadius)
    if (json.secondaryRadius != null) this.secondaryRadius = Number(json.secondaryRadius)
    if (json.offsetAngle != null) this.offsetAngle = Number(json.offsetAngle)
    if (json.matchRotation != null) this.matchRotation = !!json.matchRotation
    if (json.centerX != null) { this.centerX = Number(json.centerX); this._hasCenter = true }
    if (json.centerY != null) { this.centerY = Number(json.centerY); this._hasCenter = true }
    if (json.pinnedTargetName != null) this.pinnedTargetName = String(json.pinnedTargetName)
  }

  /**
   * Advances orbit position and optional tangent rotation.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, world, dt } = ctx
    let cx = this.centerX
    let cy = this.centerY
    if (this.pinnedTargetName && world) {
      const tid = world.findEntityIdByMetaName(this.pinnedTargetName)
      const ttr = tid != null ? (world.getComponent(tid, COMPONENT_TRANSFORM) as { x: number; y: number } | undefined) : undefined
      if (ttr) { cx = ttr.x; cy = ttr.y; this._hasCenter = true }
    } else if (!this._hasCenter) {
      cx = transform.x; cy = transform.y; this._hasCenter = true
      this.centerX = cx; this.centerY = cy
    }
    if (cx == null || cy == null) return
    this._speedCurrent += this.acceleration * dt
    this._orbitAngleDeg += this._speedCurrent * dt
    const prevA = this._prevOrbitAngleDeg * DEG
    const curA = this._orbitAngleDeg * DEG
    const off = this.offsetAngle * DEG
    const a = this.primaryRadius
    const b = this.secondaryRadius
    const x1 = a * Math.cos(curA) * Math.cos(off) - b * Math.sin(curA) * Math.sin(off)
    const y1 = a * Math.cos(curA) * Math.sin(off) + b * Math.sin(curA) * Math.cos(off)
    transform.x = cx + x1
    transform.y = cy + y1
    if (this.matchRotation) {
      const x0 = a * Math.cos(prevA) * Math.cos(off) - b * Math.sin(prevA) * Math.sin(off)
      const y0 = a * Math.cos(prevA) * Math.sin(off) + b * Math.sin(prevA) * Math.cos(off)
      const tdx = x1 - x0
      const tdy = y1 - y0
      if (Math.hypot(tdx, tdy) > 1e-6) transform.rotation = Math.atan2(tdy, tdx)
    }
    this._prevOrbitAngleDeg = this._orbitAngleDeg
  }
}
