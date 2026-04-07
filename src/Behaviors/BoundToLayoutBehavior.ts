import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

type JsonRecord = Record<string, unknown>

/**
 * Constrains entity position within layout bounds by origin or visual edge.
 *
 * `origin` mode clamps the transform pivot, while `edge` mode clamps using
 * rendered width/height with scale.
 *
 * @example
 * { "type": "boundToLayout", "boundBy": "edge" }
 */
export class BoundToLayoutBehavior extends BaseBehavior {
  static type = 'boundToLayout'
  static priority = 100
  static defaultProperties = { boundBy: 'edge' }

  boundBy = 'edge'

  /**
   * Applies bound mode from JSON (`origin` or `edge`).
   *
   * @param {JsonRecord} json Raw behavior config.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.boundBy != null) this.boundBy = String(json.boundBy)
  }

  /**
   * Normalized bound mode with fallback to `edge`.
   *
   * @returns {'origin' | 'edge'} Active bound mode.
   */
  get boundByMode (): 'origin' | 'edge' {
    return this.boundBy === 'origin' ? 'origin' : 'edge'
  }

  /**
   * Clamps transform position to configured layout constraints.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, layoutWidth, layoutHeight, displaySize } = ctx
    const w = displaySize?.width ?? 0
    const h = displaySize?.height ?? 0
    const sx = Math.abs(transform.scaleX)
    const sy = Math.abs(transform.scaleY)
    const halfW = (w * sx) / 2
    const halfH = (h * sy) / 2
    if (this.boundByMode === 'origin') {
      transform.x = clamp(transform.x, 0, layoutWidth)
      transform.y = clamp(transform.y, 0, layoutHeight)
    } else {
      const minX = halfW
      const maxX = layoutWidth - halfW
      const minY = halfH
      const maxY = layoutHeight - halfH
      if (minX <= maxX) transform.x = clamp(transform.x, minX, maxX)
      else transform.x = layoutWidth / 2
      if (minY <= maxY) transform.y = clamp(transform.y, minY, maxY)
      else transform.y = layoutHeight / 2
    }
  }
}

/**
 * Clamps a value into `[min, max]`.
 *
 * @param {number} v Input value.
 * @param {number} min Lower bound.
 * @param {number} max Upper bound.
 * @returns {number} Clamped value.
 */
function clamp (v: number, min: number, max: number): number {
  if (min > max) return v
  return Math.max(min, Math.min(max, v))
}
