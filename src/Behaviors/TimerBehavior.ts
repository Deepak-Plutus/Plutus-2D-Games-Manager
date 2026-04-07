import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { timerBehaviorDefaults } from './Config/timerBehaviorConfig.js'

type JsonRecord = Record<string, unknown>
type JsonTimer = { tag: string; duration: number; repeating: boolean; autoStart: boolean }
type TimerState = { duration: number; elapsed: number; repeating: boolean; paused: boolean; active: boolean }

/**
 * Multi-timer behavior that emits timer events per entity.
 *
 * Supports multiple named timers with pause/resume and repeating mode.
 *
 * @example
 * {
 *   "type": "timer",
 *   "timers": [{ "tag": "spawn", "duration": 1.2, "repeating": true }]
 * }
 */
export class TimerBehavior extends BaseBehavior {
  static type = 'timer'
  static priority = 3
  static defaultProperties = { ...timerBehaviorDefaults }

  defaultTag = 'default'
  private _timers = new Map<string, TimerState>()
  private _startedJson = false
  private _jsonTimers?: JsonTimer[]

  /**
   * Applies timer definitions and default tag from JSON.
   *
   * @param {JsonRecord} json Raw behavior config object.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.defaultTag != null) this.defaultTag = String(json.defaultTag)
    if (Array.isArray(json.timers)) {
      this._jsonTimers = json.timers.map(t => {
        const rec = t as JsonRecord
        return {
          tag: String(rec.tag ?? 'default'),
          duration: Number(rec.duration) || 1,
          repeating: !!rec.repeating,
          autoStart: rec.autoStart !== false
        }
      })
    }
  }

  /**
   * Starts or replaces a timer by tag.
   *
   * @param {string} tag Timer identifier.
   * @param {number} duration Timer duration in seconds.
   * @param {'once' | 'regular'} type Timer mode: one-shot or repeating.
   * @returns {void} Nothing.
   */
  startTimer (tag: string, duration: number, type: 'once' | 'regular' = 'once'): void {
    this._timers.set(String(tag), {
      duration: Math.max(1e-6, Number(duration)),
      elapsed: 0,
      repeating: String(type).toLowerCase() === 'regular',
      paused: false,
      active: true
    })
  }

  /**
   * Removes a timer by tag.
   *
   * @param {string} tag Timer identifier.
   * @returns {void} Nothing.
   */
  stopTimer (tag: string): void { this._timers.delete(String(tag)) }
  /**
   * Removes all timers.
   *
   * @returns {void} Nothing.
   */
  stopAllTimers (): void { this._timers.clear() }
  /**
   * Pauses an active timer.
   *
   * @param {string} tag Timer identifier.
   * @returns {void} Nothing.
   */
  pauseTimer (tag: string): void { const e = this._timers.get(String(tag)); if (e) e.paused = true }
  /**
   * Resumes a paused timer.
   *
   * @param {string} tag Timer identifier.
   * @returns {void} Nothing.
   */
  resumeTimer (tag: string): void { const e = this._timers.get(String(tag)); if (e) e.paused = false }

  /**
   * Advances timers and emits `timer:fired` events on expiry.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { dt, events, entityId } = ctx
    if (!this._startedJson && Array.isArray(this._jsonTimers)) {
      this._startedJson = true
      for (const t of this._jsonTimers) if (t.autoStart) this.startTimer(t.tag, t.duration, t.repeating ? 'regular' : 'once')
    }
    const remove: string[] = []
    for (const [tag, e] of this._timers) {
      if (!e.active || e.paused) continue
      e.elapsed += dt
      while (e.elapsed >= e.duration) {
        events?.emit('timer:fired', { entityId, tag })
        if (e.repeating) e.elapsed -= e.duration
        else { remove.push(tag); break }
      }
    }
    for (const t of remove) this._timers.delete(t)
  }
}
