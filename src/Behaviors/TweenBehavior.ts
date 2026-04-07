import gsap from 'gsap'
import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { tweenBehaviorDefaults } from './Config/tweenBehaviorConfig.js'

const DEG = Math.PI / 180

export class TweenBehavior extends BaseBehavior {
  static type = 'tween'
  static priority = 55
  static defaultProperties = { ...tweenBehaviorDefaults }

  defaultDuration = 1
  defaultEase = 'power2.out'
  defaultRepeat = 0
  defaultYoyo = false
  stopOnDisable = true
  private _tweens = new Map<string, gsap.core.Tween>()
  private _runtimeCtx: BehaviorRuntimeContext | null = null

  /**
   * Applies default tween options from JSON.
   *
   * @param {Record<string, unknown>} json Raw behavior config.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: Record<string, unknown>): void {
    if (json.defaultDuration != null) this.defaultDuration = Number(json.defaultDuration)
    if (json.defaultEase != null) this.defaultEase = String(json.defaultEase)
    if (json.defaultRepeat != null) this.defaultRepeat = Number(json.defaultRepeat)
    if (json.defaultYoyo != null) this.defaultYoyo = !!json.defaultYoyo
    if (json.stopOnDisable != null) this.stopOnDisable = !!json.stopOnDisable
  }

  /**
   * Enables/disables tween behavior and optionally stops active tweens.
   *
   * @param {boolean} value Desired enabled state.
   * @returns {void} Nothing.
   */
  override setEnabled (value: boolean): void {
    super.setEnabled(value)
    if (!value && this.stopOnDisable) this.stopAllTweens()
  }

  /**
   * Stops a tagged tween if present.
   *
   * @param {string} tag Tween tag.
   * @returns {void} Nothing.
   */
  stopTween (tag: string): void { const t = this._tweens.get(String(tag)); if (t) { t.kill(); this._tweens.delete(String(tag)) } }
  /**
   * Stops and clears all active tweens.
   *
   * @returns {void} Nothing.
   */
  stopAllTweens (): void { for (const t of this._tweens.values()) t.kill(); this._tweens.clear() }

  /**
   * Starts a tween for one supported property.
   *
   * @param {string} property Property name (`x`, `y`, `alpha`, `rotation`, etc).
   * @param {number} endValue Target value.
   * @param {number | undefined} duration Optional duration override.
   * @param {string | undefined} ease Optional ease override.
   * @param {string} tag Optional tween tag (default `default`).
   * @returns {void} Nothing.
   */
  startTweenOne (property: string, endValue: number, duration?: number, ease?: string, tag = 'default'): void {
    const ctx = this._runtimeCtx
    if (!ctx) return
    const prop = String(property).toLowerCase()
    const dur = duration != null ? Number(duration) : this.defaultDuration
    const tg = String(tag)
    this.stopTween(tg)
    const common: gsap.TweenVars = {
      duration: Math.max(1e-6, dur),
      ease: ease ?? this.defaultEase,
      repeat: this.defaultRepeat < 0 ? -1 : this.defaultRepeat,
      yoyo: this.defaultYoyo,
      overwrite: 'auto',
      onComplete: () => {
        this._tweens.delete(tg)
      }
    }
    const { transform, displayView } = ctx
    let tw: gsap.core.Tween | null = null
    if ((prop === 'opacity' || prop === 'alpha') && displayView) tw = gsap.to(displayView, { alpha: Number(endValue), ...common })
    else if (prop === 'width' && displayView) tw = gsap.to(displayView, { width: Number(endValue), ...common })
    else if (prop === 'height' && displayView) tw = gsap.to(displayView, { height: Number(endValue), ...common })
    else if (prop === 'angle') tw = gsap.to(transform, { rotation: Number(endValue) * DEG, ...common })
    else if (prop === 'x') tw = gsap.to(transform, { x: Number(endValue), ...common })
    else if (prop === 'y') tw = gsap.to(transform, { y: Number(endValue), ...common })
    else if (prop === 'rotation') tw = gsap.to(transform, { rotation: Number(endValue), ...common })
    else if (prop === 'scalex') tw = gsap.to(transform, { scaleX: Number(endValue), ...common })
    else if (prop === 'scaley') tw = gsap.to(transform, { scaleY: Number(endValue), ...common })
    if (tw) this._tweens.set(tg, tw)
  }

  /**
   * Caches latest runtime context for external tween triggers.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void { this._runtimeCtx = ctx }
}
