import gsap from 'gsap';
import { BaseBehavior } from './BaseBehavior.js';
import { flashBehaviorDefaults } from './Config/flashBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/flash
 */
export class FlashBehavior extends BaseBehavior {
  static type = 'flash';
  static priority = 41;

  static defaultProperties = { ...flashBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @type {gsap.core.Timeline | null} */
    this._tl = null;
    this._started = false;
  }

  applyJsonProperties(json) {
    if (json.onDuration != null) this.onDuration = Number(json.onDuration);
    if (json.offDuration != null) this.offDuration = Number(json.offDuration);
    if (json.repeatCount != null) this.repeatCount = Number(json.repeatCount);
    if (json.flashTint != null) this.flashTint = String(json.flashTint).replace(/^#/, '');
    if (json.restoreTint != null) this.restoreTint = String(json.restoreTint).replace(/^#/, '');
    if (json.ease != null) this.ease = String(json.ease);
  }

  restart() {
    this._tl?.kill();
    this._tl = null;
    this._started = false;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled() || !ctx.displayView || this._started) return;
    this._started = true;
    const view = ctx.displayView;
    const onTint = Number.parseInt(this.flashTint, 16) || 0xffffff;
    const offTint = Number.parseInt(this.restoreTint, 16) || 0xffffff;
    const tl = gsap.timeline({
      onComplete: () => {
        view.tint = offTint;
        ctx.events?.emit('flash:complete', { entityId: ctx.entityId });
      },
    });
    for (let i = 0; i < Math.max(1, this.repeatCount); i++) {
      tl.call(() => {
        view.tint = onTint;
      })
        .to({}, { duration: this.onDuration, ease: this.ease })
        .call(() => {
          view.tint = offTint;
        })
        .to({}, { duration: this.offDuration, ease: this.ease });
    }
    this._tl = tl;
  }
}
