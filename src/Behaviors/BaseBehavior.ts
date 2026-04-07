import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

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

  applyJsonProperties (_json: Record<string, unknown>): void {}

  get enabled (): boolean {
    return this.#enabled
  }

  set enabled (v: boolean) {
    this.#enabled = !!v
  }

  isEnabled (): boolean {
    return this.#enabled
  }

  setEnabled (value: boolean): void {
    this.#enabled = !!value
  }

  getCollisionContribution (): null | {
    kind?: string
    width?: number
    height?: number
    offsetX?: number
    offsetY?: number
  } {
    return null
  }

  tick (_ctx: BehaviorRuntimeContext): void {}
}
