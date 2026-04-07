import { BaseBehavior } from './BaseBehavior.js'
import { tileMovementBehaviorDefaults } from './Config/tileMovementBehaviorConfig.js'
import { isAnyKeyDown } from './KeyBindings.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

type JsonRecord = Record<string, unknown>

export class TileMovementBehavior extends BaseBehavior {
  static type = 'tileMovement'
  static priority = 16
  static defaultProperties = { ...tileMovementBehaviorDefaults }

  gridSize = 32
  moveDuration = 0.15
  isometric = false
  directions = 4
  defaultControls = false
  keyBindings: Record<string, string[]> = structuredClone(tileMovementBehaviorDefaults.keyBindings)
  private _simDir = ''
  private _fromX = 0
  private _fromY = 0
  private _toX = 0
  private _toY = 0
  private _t = 0
  private _moving = false

  applyJsonProperties (json: JsonRecord): void {
    if (json.gridSize != null) this.gridSize = Number(json.gridSize)
    if (json.moveDuration != null) this.moveDuration = Number(json.moveDuration)
    if (json.isometric != null) this.isometric = !!json.isometric
    if (json.directions != null) this.directions = Number(json.directions)
    if (json.defaultControls != null) this.defaultControls = !!json.defaultControls
  }

  simulateControl (control: string): void {
    this._simDir = String(control).toLowerCase().trim()
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, dt, input } = ctx
    if (this._moving) {
      const dur = Math.max(1e-6, this.moveDuration)
      this._t += dt / dur
      if (this._t >= 1) {
        transform.x = this._toX
        transform.y = this._toY
        this._moving = false
        this._t = 0
      } else {
        const e = 1 - (1 - this._t) * (1 - this._t)
        transform.x = this._fromX + (this._toX - this._fromX) * e
        transform.y = this._fromY + (this._toY - this._fromY) * e
      }
      return
    }
    let dx = 0
    let dy = 0
    if (this._simDir === 'left') dx = -1
    else if (this._simDir === 'right') dx = 1
    else if (this._simDir === 'up') dy = -1
    else if (this._simDir === 'down') dy = 1
    this._simDir = ''
    if (this.defaultControls && input) {
      if (isAnyKeyDown(input, this.keyBindings.left)) dx -= 1
      if (isAnyKeyDown(input, this.keyBindings.right)) dx += 1
      if (isAnyKeyDown(input, this.keyBindings.up)) dy -= 1
      if (isAnyKeyDown(input, this.keyBindings.down)) dy += 1
    }
    if (this.directions === 4 && dx !== 0 && dy !== 0) {
      if (Math.abs(dx) >= Math.abs(dy)) dy = 0
      else dx = 0
    }
    dx = Math.max(-1, Math.min(1, dx))
    dy = Math.max(-1, Math.min(1, dy))
    if (dx === 0 && dy === 0) return
    const g = Math.max(1, this.gridSize)
    this._fromX = transform.x
    this._fromY = transform.y
    const nx = this.isometric ? (dx - dy) * (g / 2) : dx * g
    const ny = this.isometric ? ((dx + dy) * g) / 4 : dy * g
    this._toX = this._fromX + nx
    this._toY = this._fromY + ny
    this._t = 0
    this._moving = true
  }
}
