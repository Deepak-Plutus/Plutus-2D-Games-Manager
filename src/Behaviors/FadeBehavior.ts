import gsap from 'gsap'
import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { fadeBehaviorDefaults } from './Config/fadeBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

/**
 * One-shot/looping alpha fade timeline behavior powered by GSAP.
 *
 * Supports fade-in, optional wait, fade-out, and optional loop/restart.
 * Can optionally destroy the entity once the sequence completes.
 *
 * @example
 * {
 *   "type": "fade",
 *   "fadeInDuration": 0.2,
 *   "waitDuration": 1.0,
 *   "fadeOutDuration": 0.4
 * }
 */
export class FadeBehavior extends BaseBehavior {
  static type = 'fade'
  static priority = 40
  static defaultProperties = { ...fadeBehaviorDefaults }

  fadeInDuration = 0
  waitDuration = 0
  fadeOutDuration = 1
  loop = false
  destroyOnComplete = false
  startDelay = 0
  ease = 'none'
  private _tl: gsap.core.Timeline | null = null
  private _started = false

  /**
   * Applies fade timeline options from JSON.
   *
   * @param {JsonRecord} json Raw behavior config object.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.fadeInDuration != null) this.fadeInDuration = Number(json.fadeInDuration)
    if (json.waitDuration != null) this.waitDuration = Number(json.waitDuration)
    if (json.fadeOutDuration != null) this.fadeOutDuration = Number(json.fadeOutDuration)
    if (json.loop != null) this.loop = !!json.loop
    if (json.destroyOnComplete != null) this.destroyOnComplete = !!json.destroyOnComplete
    if (json.startDelay != null) this.startDelay = Number(json.startDelay)
    if (json.ease != null) this.ease = String(json.ease)
  }

  /**
   * Resets internal timeline so fade can be started again.
   *
   * @returns {void} Nothing.
   */
  restart (): void {
    this._tl?.kill()
    this._tl = null
    this._started = false
  }

  /**
   * Builds and starts the fade timeline once display view is available.
   *
   * Emits `fade:complete` when a cycle finishes.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled() || !ctx.displayView || this._started) return
    this._started = true
    const view = ctx.displayView
    view.alpha = this.fadeInDuration > 0 ? 0 : 1
    const self = this
    const build = (): gsap.core.Timeline => {
      const tl = gsap.timeline({
        onComplete: () => {
          ctx.events?.emit('fade:complete', { entityId: ctx.entityId })
          if (self.destroyOnComplete) ctx.world?.destroyEntity(ctx.entityId)
          if (self.loop) {
            view.alpha = self.fadeInDuration > 0 ? 0 : 1
            self._tl?.kill()
            self._tl = build()
          }
        }
      })
      if (self.startDelay > 0) tl.delay(self.startDelay)
      if (self.fadeInDuration > 0) tl.to(view, { alpha: 1, duration: self.fadeInDuration, ease: self.ease })
      if (self.waitDuration > 0) tl.to({}, { duration: self.waitDuration })
      if (self.fadeOutDuration > 0) tl.to(view, { alpha: 0, duration: self.fadeOutDuration, ease: self.ease })
      if (self.fadeInDuration <= 0 && self.waitDuration <= 0 && self.fadeOutDuration <= 0) {
        tl.to({}, { duration: 0.01 })
      }
      return tl
    }
    this._tl = build()
  }
}
