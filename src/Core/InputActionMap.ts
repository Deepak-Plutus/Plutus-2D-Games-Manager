type JsonRecord = Record<string, unknown>

export class InputActionMap {
  private _actions: Map<string, string[]>

  constructor () {
    this._actions = new Map()
  }

  static fromConfig (inputConfig: JsonRecord = {}): InputActionMap {
    const m = new InputActionMap()
    const actions = (inputConfig.actions ?? {}) as JsonRecord
    for (const [name, val] of Object.entries(actions)) {
      if (Array.isArray(val)) {
        m._actions.set(name, val.map(String))
      } else if (val && typeof val === 'object' && Array.isArray((val as JsonRecord).keys)) {
        m._actions.set(name, ((val as JsonRecord).keys as unknown[]).map(String))
      }
    }
    return m
  }

  getTokens (name: string): string[] {
    return this._actions.get(String(name)) ?? []
  }

  getActionNames (): string[] {
    return [...this._actions.keys()]
  }
}
