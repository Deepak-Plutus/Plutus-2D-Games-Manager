import gsap from 'gsap'
import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { fadeBehaviorDefaults } from './Config/fadeBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

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

  applyJsonProperties (json: JsonRecord): void {
    if (json.fadeInDuration != null) this.fadeInDuration = Number(json.fadeInDuration)
    if (json.waitDuration != null) this.waitDuration = Number(json.waitDuration)
    if (json.fadeOutDuration != null) this.fadeOutDuration = Number(json.fadeOutDuration)
    if (json.loop != null) this.loop = !!json.loop
    if (json.destroyOnComplete != null) this.destroyOnComplete = !!json.destroyOnComplete
    if (json.startDelay != null) this.startDelay = Number(json.startDelay)
    if (json.ease != null) this.ease = String(json.ease)
  }

  restart (): void {
    this._tl?.kill()
    this._tl = null
    this._started = false
  }

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
