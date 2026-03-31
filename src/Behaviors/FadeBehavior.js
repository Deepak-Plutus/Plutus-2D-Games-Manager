import gsap from 'gsap';
import { BaseBehavior } from './BaseBehavior.js';
import { fadeBehaviorDefaults } from './Config/fadeBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/fade
 */
export class FadeBehavior extends BaseBehavior {
  static type = 'fade';
  static priority = 40;

  static defaultProperties = { ...fadeBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @type {gsap.core.Timeline | null} */
    this._tl = null;
    this._started = false;
  }

  applyJsonProperties(json) {
    if (json.fadeInDuration != null) this.fadeInDuration = Number(json.fadeInDuration);
    if (json.waitDuration != null) this.waitDuration = Number(json.waitDuration);
    if (json.fadeOutDuration != null) this.fadeOutDuration = Number(json.fadeOutDuration);
    if (json.loop != null) this.loop = !!json.loop;
    if (json.destroyOnComplete != null) this.destroyOnComplete = !!json.destroyOnComplete;
    if (json.startDelay != null) this.startDelay = Number(json.startDelay);
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
    view.alpha = this.fadeInDuration > 0 ? 0 : 1;

    const self = this;
    const build = () => {
      const tl = gsap.timeline({
        onComplete: () => {
          ctx.events?.emit('fade:complete', { entityId: ctx.entityId });
          if (self.destroyOnComplete) ctx.world?.destroyEntity(ctx.entityId);
          if (self.loop) {
            view.alpha = self.fadeInDuration > 0 ? 0 : 1;
            self._tl?.kill();
            self._tl = build();
          }
        },
      });
      if (self.startDelay > 0) tl.delay(self.startDelay);
      if (self.fadeInDuration > 0) {
        tl.to(view, { alpha: 1, duration: self.fadeInDuration, ease: self.ease });
      }
      if (self.waitDuration > 0) tl.to({}, { duration: self.waitDuration });
      if (self.fadeOutDuration > 0) {
        tl.to(view, { alpha: 0, duration: self.fadeOutDuration, ease: self.ease });
      }
      if (self.fadeInDuration <= 0 && self.waitDuration <= 0 && self.fadeOutDuration <= 0) {
        tl.to({}, { duration: 0.01 });
      }
      return tl;
    };

    this._tl = build();
  }
}
