import gsap from 'gsap'
import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { flashBehaviorDefaults } from './Config/flashBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

export class FlashBehavior extends BaseBehavior {
  static type = 'flash'
  static priority = 41
  static defaultProperties = { ...flashBehaviorDefaults }

  onDuration = 0.1
  offDuration = 0.1
  repeatCount = 3
  flashTint = 'ffffff'
  restoreTint = 'ffffff'
  ease = 'power2.inOut'
  private _tl: gsap.core.Timeline | null = null
  private _started = false

  applyJsonProperties (json: JsonRecord): void {
    if (json.onDuration != null) this.onDuration = Number(json.onDuration)
    if (json.offDuration != null) this.offDuration = Number(json.offDuration)
    if (json.repeatCount != null) this.repeatCount = Number(json.repeatCount)
    if (json.flashTint != null) this.flashTint = String(json.flashTint).replace(/^#/, '')
    if (json.restoreTint != null) this.restoreTint = String(json.restoreTint).replace(/^#/, '')
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
    const onTint = Number.parseInt(this.flashTint, 16) || 0xffffff
    const offTint = Number.parseInt(this.restoreTint, 16) || 0xffffff
    const tl = gsap.timeline({
      onComplete: () => {
        ;(view as { tint?: number }).tint = offTint
        ctx.events?.emit('flash:complete', { entityId: ctx.entityId })
      }
    })
    for (let i = 0; i < Math.max(1, this.repeatCount); i++) {
      tl.call(() => {
        ;(view as { tint?: number }).tint = onTint
      })
        .to({}, { duration: this.onDuration, ease: this.ease })
        .call(() => {
          ;(view as { tint?: number }).tint = offTint
        })
        .to({}, { duration: this.offDuration, ease: this.ease })
    }
    this._tl = tl
  }
}
