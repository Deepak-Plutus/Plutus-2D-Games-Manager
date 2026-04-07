import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { timerBehaviorDefaults } from './Config/timerBehaviorConfig.js'

type JsonRecord = Record<string, unknown>
type JsonTimer = { tag: string; duration: number; repeating: boolean; autoStart: boolean }
type TimerState = { duration: number; elapsed: number; repeating: boolean; paused: boolean; active: boolean }

export class TimerBehavior extends BaseBehavior {
  static type = 'timer'
  static priority = 3
  static defaultProperties = { ...timerBehaviorDefaults }

  defaultTag = 'default'
  private _timers = new Map<string, TimerState>()
  private _startedJson = false
  private _jsonTimers?: JsonTimer[]

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

  startTimer (tag: string, duration: number, type: 'once' | 'regular' = 'once'): void {
    this._timers.set(String(tag), {
      duration: Math.max(1e-6, Number(duration)),
      elapsed: 0,
      repeating: String(type).toLowerCase() === 'regular',
      paused: false,
      active: true
    })
  }

  stopTimer (tag: string): void { this._timers.delete(String(tag)) }
  stopAllTimers (): void { this._timers.clear() }
  pauseTimer (tag: string): void { const e = this._timers.get(String(tag)); if (e) e.paused = true }
  resumeTimer (tag: string): void { const e = this._timers.get(String(tag)); if (e) e.paused = false }

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
