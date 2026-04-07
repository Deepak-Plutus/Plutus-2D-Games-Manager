import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { wrapBehaviorDefaults } from './Config/wrapBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

/**
 * Screen/layout wrap behavior for horizontal and vertical axes.
 *
 * When enabled, an entity leaving one side of bounds appears on the opposite
 * side while preserving axis-independent control.
 *
 * @example
 * { "type": "wrap", "wrapHorizontal": true, "wrapVertical": false, "margin": 24 }
 */
export class WrapBehavior extends BaseBehavior {
  static type = 'wrap'
  static priority = 88
  static defaultProperties = { ...wrapBehaviorDefaults }

  wrapTo = 'layout'
  wrapHorizontal = true
  wrapVertical = true
  margin = 0

  /**
   * Applies wrap mode, axis flags, and margin from JSON.
   *
   * @param {JsonRecord} json Raw behavior config object.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.wrapTo != null) this.wrapTo = String(json.wrapTo).toLowerCase()
    if (json.wrapHorizontal != null) this.wrapHorizontal = !!json.wrapHorizontal
    if (json.wrapVertical != null) this.wrapVertical = !!json.wrapVertical
    if (json.margin != null) this.margin = Number(json.margin)
  }

  /**
   * Sets wrap target mode metadata.
   *
   * @param {string} mode Wrap mode label.
   * @returns {void} Nothing.
   */
  setWrapTo (mode: string): void {
    this.wrapTo = String(mode).toLowerCase()
  }
  /**
   * Enables/disables horizontal wrapping.
   *
   * @param {boolean} v New state.
   * @returns {void} Nothing.
   */
  setWrapHorizontal (v: boolean): void {
    this.wrapHorizontal = !!v
  }
  /**
   * Enables/disables vertical wrapping.
   *
   * @param {boolean} v New state.
   * @returns {void} Nothing.
   */
  setWrapVertical (v: boolean): void {
    this.wrapVertical = !!v
  }
  /**
   * Sets extra bounds margin used by wrapping tests.
   *
   * @param {number} m Margin in layout units.
   * @returns {void} Nothing.
   */
  setMargin (m: number): void {
    this.margin = Number(m)
  }

  /**
   * Wraps entity position when it exits the configured bounds.
   *
   * Emits `wrap:wrapped` after a successful wrap.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, layoutWidth, layoutHeight, displaySize, events, entityId } = ctx
    const m = Math.max(0, this.margin)
    const left = m
    const right = layoutWidth - m
    const top = m
    const bottom = layoutHeight - m
    const vw = displaySize?.width ?? 32
    const vh = displaySize?.height ?? 32
    const halfW = (Math.abs(vw) * Math.abs(transform.scaleX)) / 2
    const halfH = (Math.abs(vh) * Math.abs(transform.scaleY)) / 2
    let wrapped = false
    let axis = ''
    if (this.wrapHorizontal) {
      if (transform.x - halfW > right) {
        transform.x = left + halfW
        wrapped = true
        axis = 'horizontal'
      } else if (transform.x + halfW < left) {
        transform.x = right - halfW
        wrapped = true
        axis = 'horizontal'
      }
    }
    if (this.wrapVertical) {
      if (transform.y - halfH > bottom) {
        transform.y = top + halfH
        wrapped = true
        axis = axis ? 'both' : 'vertical'
      } else if (transform.y + halfH < top) {
        transform.y = bottom - halfH
        wrapped = true
        axis = axis ? 'both' : 'vertical'
      }
    }
    if (wrapped) events?.emit('wrap:wrapped', { entityId, axis, wrapTo: this.wrapTo })
  }
}
