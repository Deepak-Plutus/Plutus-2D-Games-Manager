import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { scrollToBehaviorDefaults } from './Config/scrollToBehaviorConfig.js'

export class ScrollToBehavior extends BaseBehavior {
  static type = 'scrollTo'
  static priority = 950
  static defaultProperties = { ...scrollToBehaviorDefaults }

  private _scrollState: {
    points: Array<{ x: number; y: number }>
    shake: { timeLeft: number; magnitude: number; reducing: boolean; totalDuration: number }
  } | null = null

  shake (magnitude: number, duration: number, mode: 'reducing' | 'constant' = 'reducing'): void {
    const st = this._scrollState
    if (!st?.shake) return
    st.shake.magnitude = Number(magnitude)
    st.shake.timeLeft = Number(duration)
    st.shake.totalDuration = Math.max(1e-6, Number(duration))
    st.shake.reducing = String(mode).toLowerCase() !== 'constant'
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (ctx.scrollState) this._scrollState = ctx.scrollState
    if (!this.isEnabled() || !ctx.scrollState) return
    ctx.scrollState.points.push({ x: ctx.transform.x, y: ctx.transform.y })
  }
}
