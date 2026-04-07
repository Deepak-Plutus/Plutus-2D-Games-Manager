import { BaseBehavior } from './BaseBehavior.js'
import { carBehaviorDefaults } from './Config/carBehaviorConfig.js'
import { isAnyKeyDown } from './KeyBindings.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

const DEG = Math.PI / 180
type JsonRecord = Record<string, unknown>

/**
 * Arcade-style car controller behavior.
 *
 * Supports:
 * - keyboard control via `keyBindings`
 * - simulated one-frame controls via `simulateControl()`
 * - acceleration/deceleration steering model
 *
 * @example
 * // JSON behavior config
 * { "type": "car", "maxSpeed": 300, "steerSpeed": 110 }
 */
export class CarBehavior extends BaseBehavior {
  static type = 'car'
  static priority = 14
  static defaultProperties = { ...carBehaviorDefaults }

  maxSpeed = 350
  acceleration = 1200
  deceleration = 1400
  steerSpeed = 120
  defaultControls = true
  driftFactor = 0
  keyBindings: Record<string, string[]> = structuredClone(carBehaviorDefaults.keyBindings)
  private _speed = 0
  private _heading: number | null = null
  private _simAccel = 0
  private _simSteer = 0

  /**
   * Applies driving parameters and key bindings from JSON.
   *
   * @param {JsonRecord} json Raw behavior config object.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed)
    if (json.acceleration != null) this.acceleration = Number(json.acceleration)
    if (json.deceleration != null) this.deceleration = Number(json.deceleration)
    if (json.steerSpeed != null) this.steerSpeed = Number(json.steerSpeed)
    if (json.defaultControls != null) this.defaultControls = !!json.defaultControls
    if (json.driftFactor != null) this.driftFactor = Number(json.driftFactor)
    if (json.keyBindings != null && typeof json.keyBindings === 'object') this.updateKeyBindings(json.keyBindings as JsonRecord)
  }

  /**
   * Merges partial keybinding definitions into existing bindings.
   *
   * @param {JsonRecord} partial Map of action -> key code array.
   * @returns {void} Nothing.
   *
   * @example
   * behavior.updateKeyBindings({ steerLeft: ['ArrowLeft', 'KeyA'] })
   */
  updateKeyBindings (partial: JsonRecord): void {
    for (const [action, codes] of Object.entries(partial)) {
      if (!Array.isArray(codes)) continue
      this.keyBindings[action] = codes.map(c => String(c))
    }
  }

  /**
   * Injects one frame of simulated control input.
   *
   * Accepted aliases include:
   * `accelerate|forward|up`, `brake|reverse|down`,
   * `steerLeft|left`, `steerRight|right`.
   *
   * @param {string} control Control label to apply for the next tick.
   * @returns {void} Nothing.
   */
  simulateControl (control: string): void {
    const c = String(control).toLowerCase().trim()
    if (c === 'accelerate' || c === 'forward' || c === 'up') this._simAccel += 1
    if (c === 'brake' || c === 'reverse' || c === 'down') this._simAccel -= 1
    if (c === 'steerleft' || c === 'left') this._simSteer -= 1
    if (c === 'steerright' || c === 'right') this._simSteer += 1
  }

  /**
   * Immediately zeroes current speed.
   *
   * @returns {void} Nothing.
   */
  stop (): void {
    this._speed = 0
  }

  /**
   * Advances car movement and heading each frame.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, dt, input } = ctx
    if (this._heading == null) this._heading = transform.rotation
    let throttle = Math.max(-1, Math.min(1, this._simAccel))
    let steer = Math.max(-1, Math.min(1, this._simSteer))
    this._simAccel = 0
    this._simSteer = 0
    if (this.defaultControls && input) {
      if (isAnyKeyDown(input, this.keyBindings.accelerate)) throttle += 1
      if (isAnyKeyDown(input, this.keyBindings.brake)) throttle -= 1
      if (isAnyKeyDown(input, this.keyBindings.steerLeft)) steer -= 1
      if (isAnyKeyDown(input, this.keyBindings.steerRight)) steer += 1
    }
    throttle = Math.max(-1, Math.min(1, throttle))
    steer = Math.max(-1, Math.min(1, steer))
    if (Math.abs(this._speed) > 1) this._heading += steer * this.steerSpeed * DEG * dt * Math.sign(this._speed)
    else if (Math.abs(steer) > 0.01) this._heading += steer * this.steerSpeed * DEG * dt * 0.35
    if (throttle > 0) this._speed = moveToward(this._speed, this.maxSpeed, this.acceleration * dt)
    else if (throttle < 0) this._speed = moveToward(this._speed, -this.maxSpeed * 0.55, this.acceleration * dt)
    else {
      const dec = this.deceleration * dt
      this._speed = Math.abs(this._speed) <= dec ? 0 : this._speed - Math.sign(this._speed) * dec
    }
    transform.x += Math.cos(this._heading) * this._speed * dt
    transform.y += Math.sin(this._heading) * this._speed * dt
    transform.rotation = this._heading
  }
}

/**
 * Moves a scalar value toward a target by a bounded step.
 *
 * @param {number} cur Current value.
 * @param {number} target Desired value.
 * @param {number} maxStep Maximum absolute movement allowed this call.
 * @returns {number} Next value after bounded movement.
 */
function moveToward (cur: number, target: number, maxStep: number): number {
  const d = target - cur
  if (Math.abs(d) <= maxStep) return target
  return cur + Math.sign(d) * maxStep
}
