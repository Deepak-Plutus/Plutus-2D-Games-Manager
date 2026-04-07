import { BaseBehavior } from './BaseBehavior.js'
import { solidBehaviorDefaults } from './Config/solidBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

/**
 * Behavior-only solid collider contributor.
 * Emits a `solid` collision shape through parser collision contribution.
 */
export class SolidBehavior extends BaseBehavior {
  static type = 'solid'
  static priority = 5
  static defaultProperties = { ...solidBehaviorDefaults }

  collisionWidth = 0
  collisionHeight = 0
  offsetX = 0
  offsetY = 0

  /**
   * Applies collider size/offset properties from JSON.
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
   * Produces solid collision contribution consumed by entity parser.
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
      kind: 'solid',
      width: this.collisionWidth,
      height: this.collisionHeight,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    }
  }
}
