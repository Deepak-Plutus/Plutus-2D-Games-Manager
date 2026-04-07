import { BaseBehavior } from './BaseBehavior.js'
import { rotateBehaviorDefaults } from './Config/rotateBehaviorConfig.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

const DEG = Math.PI / 180
type JsonRecord = Record<string, unknown>

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

  applyJsonProperties (json: JsonRecord): void {
    if (json.speed != null) {
      this.speed = Number(json.speed)
      this._speedCurrent = this.speed
    }
    if (json.acceleration != null) this.acceleration = Number(json.acceleration)
  }

  setSpeed (degPerSec: number): void {
    this.speed = Number(degPerSec)
    this._speedCurrent = this.speed
  }

  setAcceleration (degPerSec2: number): void {
    this.acceleration = Number(degPerSec2)
  }

  get angularSpeed (): number {
    return this._speedCurrent
  }
  get Speed (): number {
    return this._speedCurrent
  }
  get Acceleration (): number {
    return this.acceleration
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, dt } = ctx
    this._speedCurrent += this.acceleration * dt
    transform.rotation += this._speedCurrent * DEG * dt
  }
}
