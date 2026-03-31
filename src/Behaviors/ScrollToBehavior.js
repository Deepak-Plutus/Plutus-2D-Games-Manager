import { BaseBehavior } from './BaseBehavior.js';
import { scrollToBehaviorDefaults } from './Config/scrollToBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/scroll-to
 */
export class ScrollToBehavior extends BaseBehavior {
  static type = 'scrollTo';
  static priority = 950;

  static defaultProperties = { ...scrollToBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private @type {{ points: { x: number, y: number }[], shake: object } | null} */
    this._scrollState = null;
  }

  /**
   * @param {number} magnitude px
   * @param {number} duration sec
   * @param {'reducing'|'constant'} [mode]
   */
  shake(magnitude, duration, mode = 'reducing') {
    const st = this._scrollState;
    if (!st?.shake) return;
    const reducing = String(mode).toLowerCase() !== 'constant';
    st.shake.magnitude = Number(magnitude);
    st.shake.timeLeft = Number(duration);
    st.shake.totalDuration = Math.max(1e-6, Number(duration));
    st.shake.reducing = reducing;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (ctx.scrollState) this._scrollState = ctx.scrollState;
    if (!this.isEnabled() || !ctx.scrollState) return;
    ctx.scrollState.points.push({ x: ctx.transform.x, y: ctx.transform.y });
  }
}
