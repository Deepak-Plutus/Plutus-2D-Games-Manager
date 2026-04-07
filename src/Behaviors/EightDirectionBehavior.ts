import { BaseBehavior } from './BaseBehavior.js'
import { EIGHT_DIRECTION_SIMULATE_DELTA } from './Config/eightDirectionSimulateConfig.js'
import { isAnyKeyDown } from './KeyBindings.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

type JsonRecord = Record<string, unknown>

export class EightDirectionBehavior extends BaseBehavior {
  static type = 'eightDirection'
  static priority = 10
  static defaultProperties = {
    maxSpeed: 200,
    acceleration: 1500,
    deceleration: 1500,
    directions: 8,
    defaultControls: true,
    allowDiagonal: true,
    keyBindings: { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'] }
  }

  maxSpeed = 200
  acceleration = 1500
  deceleration = 1500
  directions = 8
  defaultControls = true
  allowDiagonal = true
  keyBindings: Record<string, string[]> = structuredClone(EightDirectionBehavior.defaultProperties.keyBindings)
  private _vx = 0
  private _vy = 0
  private _simDx = 0
  private _simDy = 0

  applyJsonProperties (json: JsonRecord): void {
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed)
    if (json.acceleration != null) this.acceleration = Number(json.acceleration)
    if (json.deceleration != null) this.deceleration = Number(json.deceleration)
    if (json.directions != null) this.directions = Number(json.directions)
    if (json.defaultControls != null) this.defaultControls = !!json.defaultControls
    if (json.allowDiagonal != null) this.allowDiagonal = !!json.allowDiagonal
  }

  simulateControl (control: string): void {
    const d = EIGHT_DIRECTION_SIMULATE_DELTA[String(control).toLowerCase().trim() as keyof typeof EIGHT_DIRECTION_SIMULATE_DELTA]
    if (d) { this._simDx += d.dx; this._simDy += d.dy }
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, dt, input } = ctx
    let dx = Math.max(-1, Math.min(1, this._simDx))
    let dy = Math.max(-1, Math.min(1, this._simDy))
    this._simDx = 0; this._simDy = 0
    if (this.defaultControls && input) {
      if (isAnyKeyDown(input, this.keyBindings.left)) dx -= 1
      if (isAnyKeyDown(input, this.keyBindings.right)) dx += 1
      if (isAnyKeyDown(input, this.keyBindings.up)) dy -= 1
      if (isAnyKeyDown(input, this.keyBindings.down)) dy += 1
    }
    dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy))
    if ((this.directions === 4 || !this.allowDiagonal) && dx !== 0 && dy !== 0) {
      if (Math.abs(dx) >= Math.abs(dy)) dy = 0
      else dx = 0
    }
    const len = Math.hypot(dx, dy)
    const tx = len > 0 ? (dx / len) * this.maxSpeed : 0
    const ty = len > 0 ? (dy / len) * this.maxSpeed : 0
    const ax = this.acceleration * dt
    const dec = this.deceleration * dt
    if (tx === 0 && ty === 0) {
      const sl = Math.hypot(this._vx, this._vy)
      if (sl <= dec || sl === 0) { this._vx = 0; this._vy = 0 }
      else { this._vx -= (this._vx / sl) * dec; this._vy -= (this._vy / sl) * dec }
    } else {
      this._vx = moveToward(this._vx, tx, ax)
      this._vy = moveToward(this._vy, ty, ax)
    }
    transform.x += this._vx * dt
    transform.y += this._vy * dt
  }
}

function moveToward (current: number, target: number, maxStep: number): number {
  const d = target - current
  if (Math.abs(d) <= maxStep) return target
  return current + Math.sign(d) * maxStep
}
