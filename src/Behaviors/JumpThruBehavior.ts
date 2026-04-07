import { BaseBehavior } from './BaseBehavior.js'
import { jumpThruBehaviorDefaults } from './Config/jumpThruBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

/**
 * Behavior-only jump-through platform collider contributor.
 * Intended for one-way landing surfaces.
 */
export class JumpThruBehavior extends BaseBehavior {
  static type = 'jumpThru'
  static priority = 5
  static defaultProperties = { ...jumpThruBehaviorDefaults }

  collisionWidth = 0
  collisionHeight = 0
  offsetX = 0
  offsetY = 0

  /**
   * Applies jump-thru collider size/offset from JSON.
   *
   * @param {JsonRecord} json Raw behavior config.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.collisionWidth != null) this.collisionWidth = Number(json.collisionWidth)
    if (json.collisionHeight != null) this.collisionHeight = Number(json.collisionHeight)
    if (json.offsetX != null) this.offsetX = Number(json.offsetX)
    if (json.offsetY != null) this.offsetY = Number(json.offsetY)
  }

  /**
   * Produces jump-thru collision contribution for parser pipeline.
   *
   * @returns {{ kind: string; width: number; height: number; offsetX: number; offsetY: number }}
   */
  getCollisionContribution (): {
    kind: string
    width: number
    height: number
    offsetX: number
    offsetY: number
  } {
    return {
      kind: 'jumpThru',
      width: this.collisionWidth,
      height: this.collisionHeight,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    }
  }
}
