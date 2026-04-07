import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { scrollToBehaviorDefaults } from './Config/scrollToBehaviorConfig.js'

/**
 * Feeds entity positions into shared scroll/camera trail state.
 *
 * Usually attached to camera-follow targets so camera systems can consume
 * buffered points and optional shake values.
 */
export class ScrollToBehavior extends BaseBehavior {
  static type = 'scrollTo'
  static priority = 950
  static defaultProperties = { ...scrollToBehaviorDefaults }

  private _scrollState: {
    points: Array<{ x: number; y: number }>
    shake: { timeLeft: number; magnitude: number; reducing: boolean; totalDuration: number }
  } | null = null

  /**
   * Triggers shake values on the active shared scroll state.
   *
   * @param {number} magnitude Shake intensity in world units.
   * @param {number} duration Shake duration in seconds.
   * @param {'reducing' | 'constant'} mode Shake attenuation mode.
   * @returns {void} Nothing.
   *
   * @example
   * behavior.shake(8, 0.35, 'reducing')
   */
  shake (magnitude: number, duration: number, mode: 'reducing' | 'constant' = 'reducing'): void {
    const st = this._scrollState
    if (!st?.shake) return
    st.shake.magnitude = Number(magnitude)
    st.shake.timeLeft = Number(duration)
    st.shake.totalDuration = Math.max(1e-6, Number(duration))
    st.shake.reducing = String(mode).toLowerCase() !== 'constant'
  }

  /**
   * Appends current transform position to the scroll state path buffer.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (ctx.scrollState) this._scrollState = ctx.scrollState
    if (!this.isEnabled() || !ctx.scrollState) return
    ctx.scrollState.points.push({ x: ctx.transform.x, y: ctx.transform.y })
  }
}
