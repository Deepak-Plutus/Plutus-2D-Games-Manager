type JsonRecord = Record<string, unknown>

/**
 * Maps logical action names to token lists (keys/buttons/sticks).
 */
export class InputActionMap {
  private _actions: Map<string, string[]>

  constructor () {
    this._actions = new Map()
  }

  /**
   * Builds an action map from input config.
   *
   * @param {JsonRecord} inputConfig Input config root.
   * @returns {InputActionMap} Parsed action map.
   */
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

  /**
   * Returns bound tokens for an action.
   *
   * @param {string} name Action name.
   * @returns {string[]} Tokens mapped to the action.
   */
  getTokens (name: string): string[] {
    return this._actions.get(String(name)) ?? []
  }

  /**
   * Returns all known action names.
   *
   * @returns {string[]} All action names.
   */
  getActionNames (): string[] {
    return [...this._actions.keys()]
  }
}
