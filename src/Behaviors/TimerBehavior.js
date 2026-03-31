import { BaseBehavior } from './BaseBehavior.js';
import { timerBehaviorDefaults } from './Config/timerBehaviorConfig.js';

/**
 * Tagged countdown / repeat timers (game time via dt).
 *
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/timer
 */
export class TimerBehavior extends BaseBehavior {
  static type = 'timer';
  static priority = 3;

  static defaultProperties = { ...timerBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /**
     * @private
     * @type {Map<string, { duration: number, elapsed: number, repeating: boolean, paused: boolean, active: boolean }>}
     */
    this._timers = new Map();
    /** @private */
    this._startedJson = false;
  }

  applyJsonProperties(json) {
    if (json.defaultTag != null) this.defaultTag = String(json.defaultTag);
    if (Array.isArray(json.timers)) {
      this._jsonTimers = json.timers.map((t) => ({
        tag: String((/** @type {Record<string, unknown>} */ (t)).tag ?? 'default'),
        duration: Number((/** @type {Record<string, unknown>} */ (t)).duration) || 1,
        repeating: !!(/** @type {Record<string, unknown>} */ (t)).repeating,
        autoStart: (/** @type {Record<string, unknown>} */ (t)).autoStart !== false,
      }));
    }
  }

  /**
   * @param {string} tag
   * @param {number} duration seconds
   * @param {'once'|'regular'} [type] regular = repeat
   */
  startTimer(tag, duration, type = 'once') {
    const repeating = String(type).toLowerCase() === 'regular';
    this._timers.set(String(tag), {
      duration: Math.max(1e-6, Number(duration)),
      elapsed: 0,
      repeating,
      paused: false,
      active: true,
    });
  }

  stopTimer(tag) {
    this._timers.delete(String(tag));
  }

  stopAllTimers() {
    this._timers.clear();
  }

  pauseTimer(tag) {
    const e = this._timers.get(String(tag));
    if (e) e.paused = true;
  }

  resumeTimer(tag) {
    const e = this._timers.get(String(tag));
    if (e) e.paused = false;
  }

  pauseAllTimers() {
    for (const e of this._timers.values()) e.paused = true;
  }

  resumeAllTimers() {
    for (const e of this._timers.values()) e.paused = false;
  }

  /** Reset elapsed without changing duration / mode */
  resetTimer(tag) {
    const e = this._timers.get(String(tag));
    if (e) e.elapsed = 0;
  }

  isTimerRunning(tag) {
    const e = this._timers.get(String(tag));
    return !!(e && e.active && !e.paused);
  }

  getTimerDuration(tag) {
    return this._timers.get(String(tag))?.duration ?? 0;
  }

  /** Seconds remaining until next fire */
  getTimerRemaining(tag) {
    const e = this._timers.get(String(tag));
    if (!e || !e.active) return 0;
    return Math.max(0, e.duration - e.elapsed);
  }

  /** Elapsed since last start / last fire (for repeating) */
  getTimerElapsed(tag) {
    return this._timers.get(String(tag))?.elapsed ?? 0;
  }

  setTimerDuration(tag, duration) {
    const e = this._timers.get(String(tag));
    if (e) e.duration = Math.max(1e-6, Number(duration));
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { dt, events, entityId } = ctx;

    if (!this._startedJson && Array.isArray(this._jsonTimers)) {
      this._startedJson = true;
      for (const t of this._jsonTimers) {
        if (t.autoStart) this.startTimer(t.tag, t.duration, t.repeating ? 'regular' : 'once');
      }
    }

    /** @type {string[]} */
    const remove = [];
    for (const [tag, e] of this._timers) {
      if (!e.active || e.paused) continue;
      e.elapsed += dt;
      while (e.elapsed >= e.duration) {
        events?.emit('timer:fired', { entityId, tag });
        if (e.repeating) {
          e.elapsed -= e.duration;
        } else {
          remove.push(tag);
          break;
        }
      }
    }
    for (const t of remove) this._timers.delete(t);
  }
}
