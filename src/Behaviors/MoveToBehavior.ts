import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { moveToBehaviorDefaults } from './Config/moveToBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

/**
 * Steering behavior that accelerates an entity toward a target point.
 *
 * Uses velocity smoothing (`acceleration`) instead of teleporting, and can
 * optionally rotate the transform to face the destination.
 *
 * @example
 * { "type": "moveTo", "targetX": 640, "targetY": 360, "maxSpeed": 220 }
 */
export class MoveToBehavior extends BaseBehavior {
  static type = 'moveTo'
  static priority = 15
  static defaultProperties = { ...moveToBehaviorDefaults }

  targetX = 0
  targetY = 0
  maxSpeed = 200
  acceleration = 800
  arriveDistance = 2
  rotateToward = false
  autoStart = true
  private _vx = 0
  private _vy = 0
  private _moving = this.autoStart

  constructor (json: JsonRecord = {}) {
    super(json)
    this._moving = this.autoStart
  }

  /**
   * Applies target and steering parameters from JSON.
   *
   * @param {JsonRecord} json Raw behavior config object.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.targetX != null) this.targetX = Number(json.targetX)
    if (json.targetY != null) this.targetY = Number(json.targetY)
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed)
    if (json.acceleration != null) this.acceleration = Number(json.acceleration)
    if (json.arriveDistance != null) this.arriveDistance = Number(json.arriveDistance)
    if (json.rotateToward != null) this.rotateToward = !!json.rotateToward
    if (json.autoStart != null) {
      this.autoStart = !!json.autoStart
      this._moving = this.autoStart
    }
  }

  /**
   * Indicates whether movement toward a destination is currently active.
   *
   * @returns {boolean} `true` when movement updates are running.
   */
  get isMoving (): boolean {
    return this._moving
  }

  /**
   * Sets a new destination and starts movement.
   *
   * @param {number} x Destination x.
   * @param {number} y Destination y.
   * @returns {void} Nothing.
   */
  setDestination (x: number, y: number): void {
    this.targetX = Number(x)
    this.targetY = Number(y)
    this._moving = true
  }

  /**
   * Stops movement and clears current velocity.
   *
   * @returns {void} Nothing.
   */
  stop (): void {
    this._moving = false
    this._vx = 0
    this._vy = 0
  }

  /**
   * Resumes movement toward the current destination.
   *
   * @returns {void} Nothing.
   */
  start (): void {
    this._moving = true
  }

  /**
   * Updates velocity and position until destination is reached.
   *
   * Emits `moveTo:arrived` when the entity reaches the destination.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled() || !this._moving) return
    const { transform, dt, events, entityId } = ctx
    const dx = this.targetX - transform.x
    const dy = this.targetY - transform.y
    const d = Math.hypot(dx, dy)
    if (d <= this.arriveDistance) {
      transform.x = this.targetX
      transform.y = this.targetY
      this._vx = 0
      this._vy = 0
      this._moving = false
      events?.emit('moveTo:arrived', { entityId, x: transform.x, y: transform.y })
      return
    }
    const dirx = dx / d
    const diry = dy / d
    const txv = dirx * this.maxSpeed
    const tyv = diry * this.maxSpeed
    this._vx = moveToward(this._vx, txv, this.acceleration * dt)
    this._vy = moveToward(this._vy, tyv, this.acceleration * dt)
    transform.x += this._vx * dt
    transform.y += this._vy * dt
    if (this.rotateToward) transform.rotation = Math.atan2(dy, dx)
  }
}

/**
 * Moves `current` toward `target` by at most `maxStep`.
 *
 * @param {number} current Current scalar value.
 * @param {number} target Desired scalar value.
 * @param {number} maxStep Maximum allowed change.
 * @returns {number} Next scalar value.
 */
function moveToward (current: number, target: number, maxStep: number): number {
  const d = target - current
  if (Math.abs(d) <= maxStep) return target
  return current + Math.sign(d) * maxStep
}
