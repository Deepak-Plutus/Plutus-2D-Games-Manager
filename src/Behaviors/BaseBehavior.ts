import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

/**
 * Base class for all runtime behaviors.
 *
 * Each concrete behavior extends this class and implements `tick()` and
 * optionally `applyJsonProperties()` / `getCollisionContribution()`.
 * The base class also hydrates static `defaultProperties`.
 *
 * @example
 * class MyBehavior extends BaseBehavior {
 *   static type = 'myBehavior'
 *   tick(ctx) {
 *     ctx.transform.x += 10 * ctx.dt
 *   }
 * }
 */
export class BaseBehavior {
  static type = 'base'
  static defaultProperties: Record<string, unknown> = {}
  static priority = 50

  #enabled = true

  constructor (json: Record<string, unknown> = {}) {
    this.#enabled = json.enabled !== false
    this._applyPropertyDefaults()
    this.applyJsonProperties(json)
  }

  private _applyPropertyDefaults (): void {
    const C = this.constructor as typeof BaseBehavior
    const defs = C.defaultProperties
    for (const key of Object.keys(defs)) {
      if ((this as Record<string, unknown>)[key] === undefined) {
        const v = defs[key]
        ;(this as Record<string, unknown>)[key] =
          typeof v === 'object' && v !== null && !Array.isArray(v) ? structuredClone(v) : v
      }
    }
  }

  /**
   * Applies user-authored JSON properties to the behavior instance.
   * Subclasses should override this to map config values to fields.
   *
   * @param {Record<string, unknown>} _json Behavior config object from entity/objectType JSON.
   * @returns {void} Nothing.
   */
  applyJsonProperties (_json: Record<string, unknown>): void {}

  get enabled (): boolean {
    return this.#enabled
  }

  set enabled (v: boolean) {
    this.#enabled = !!v
  }

  /**
   * Returns whether this behavior is currently active.
   *
   * @returns {boolean} `true` if this behavior should tick.
   */
  isEnabled (): boolean {
    return this.#enabled
  }

  /**
   * Explicitly enables or disables this behavior instance.
   *
   * @param {boolean} value Desired enabled state.
   * @returns {void} Nothing.
   */
  setEnabled (value: boolean): void {
    this.#enabled = !!value
  }

  /**
   * Returns optional collider data contributed by this behavior.
   *
   * Most behaviors return `null`. Behaviors that generate colliders may return
   * dimensions and offsets that the parser applies to collision components.
   *
   * @returns {null | { kind?: string, width?: number, height?: number, offsetX?: number, offsetY?: number }}
   * Collision contribution or `null`.
   */
  getCollisionContribution (): null | {
    kind?: string
    width?: number
    height?: number
    offsetX?: number
    offsetY?: number
  } {
    return null
  }

  /**
   * Per-frame behavior update hook.
   *
   * @param {BehaviorRuntimeContext} _ctx Runtime behavior context for this entity/frame.
   * @returns {void} Nothing.
   */
  tick (_ctx: BehaviorRuntimeContext): void {}
}
