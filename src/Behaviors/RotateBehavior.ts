import { BaseBehavior } from './BaseBehavior.js'
import { rotateBehaviorDefaults } from './Config/rotateBehaviorConfig.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

const DEG = Math.PI / 180
type JsonRecord = Record<string, unknown>

/**
 * Constant/angular-acceleration rotation behavior.
 *
 * Rotates transform every frame in degrees-per-second space with optional
 * acceleration for spin-up / spin-down effects.
 *
 * @example
 * { "type": "rotate", "speed": 90, "acceleration": 20 }
 */
export class RotateBehavior extends BaseBehavior {
  static type = 'rotate'
  static priority = 50
  static defaultProperties = { ...rotateBehaviorDefaults }

  speed = 90
  acceleration = 0
  private _speedCurrent = this.speed

  constructor (json: JsonRecord = {}) {
    super(json)
    this._speedCurrent = this.speed
  }

  /**
   * Applies rotation speed and acceleration values from JSON.
   *
   * @param {JsonRecord} json Raw behavior config object.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.speed != null) {
      this.speed = Number(json.speed)
      this._speedCurrent = this.speed
    }
    if (json.acceleration != null) this.acceleration = Number(json.acceleration)
  }

  /**
   * Sets the current angular speed in degrees per second.
   *
   * @param {number} degPerSec Angular speed in degrees/sec.
   * @returns {void} Nothing.
   */
  setSpeed (degPerSec: number): void {
    this.speed = Number(degPerSec)
    this._speedCurrent = this.speed
  }

  /**
   * Sets angular acceleration in degrees per second squared.
   *
   * @param {number} degPerSec2 Angular acceleration in degrees/sec^2.
   * @returns {void} Nothing.
   */
  setAcceleration (degPerSec2: number): void {
    this.acceleration = Number(degPerSec2)
  }

  /**
   * Current angular speed used for integration.
   *
   * @returns {number} Angular speed in degrees/sec.
   */
  get angularSpeed (): number {
    return this._speedCurrent
  }
  get Speed (): number {
    return this._speedCurrent
  }
  get Acceleration (): number {
    return this.acceleration
  }

  /**
   * Advances rotation by integrating angular speed each frame.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, dt } = ctx
    this._speedCurrent += this.acceleration * dt
    transform.rotation += this._speedCurrent * DEG * dt
  }
}
