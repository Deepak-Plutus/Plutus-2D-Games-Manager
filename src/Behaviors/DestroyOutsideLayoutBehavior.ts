import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { destroyOutsideBehaviorDefaults } from './Config/destroyOutsideBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

/**
 * Destroys entities once they leave layout bounds plus configured margins.
 *
 * Useful for bullets/particles/enemies that should be removed when outside
 * active play space.
 *
 * @example
 * { "type": "destroyOutside", "marginLeft": 80, "marginRight": 80 }
 */
export class DestroyOutsideLayoutBehavior extends BaseBehavior {
  static type = 'destroyOutside'
  static priority = 110
  static defaultProperties = { ...destroyOutsideBehaviorDefaults }

  marginLeft = 0
  marginRight = 0
  marginTop = 0
  marginBottom = 0

  /**
   * Applies destroy margins from JSON.
   *
   * @param {JsonRecord} json Raw behavior config object.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.marginLeft != null) this.marginLeft = Number(json.marginLeft)
    if (json.marginRight != null) this.marginRight = Number(json.marginRight)
    if (json.marginTop != null) this.marginTop = Number(json.marginTop)
    if (json.marginBottom != null) this.marginBottom = Number(json.marginBottom)
  }

  /**
   * Removes entity when its bounds move outside allowed area.
   *
   * Emits `destroyOutside:beforeDestroy` just before removal.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, layoutWidth, layoutHeight, displaySize, entityId, world, events } = ctx
    const w = displaySize?.width ?? 0
    const h = displaySize?.height ?? 0
    const halfW = (Math.abs(w) * Math.abs(transform.scaleX)) / 2
    const halfH = (Math.abs(h) * Math.abs(transform.scaleY)) / 2
    const minX = -this.marginLeft + halfW
    const maxX = layoutWidth + this.marginRight - halfW
    const minY = -this.marginTop + halfH
    const maxY = layoutHeight + this.marginBottom - halfH
    const { x, y } = transform
    if (x < minX || x > maxX || y < minY || y > maxY) {
      events?.emit('destroyOutside:beforeDestroy', { entityId, x, y })
      world?.destroyEntity(entityId)
    }
  }
}
