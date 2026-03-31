/**
 * Maps logical action names → key codes, mouse buttons, gamepad buttons, or stick axes.
 * Config shape:
 * ```json
 * { "actions": { "jump": ["Space", "KeyW"], "fire": ["Mouse0"], "menu": ["Escape"] } }
 * ```
 *
 * Tokens:
 * - `KeyW`, `Space`, `ArrowLeft`, … → {@link import('./KeyboardInput.js').KeyboardInput}.isDown
 * - `Mouse0` … `Mouse4` → pointer + button
 * - `Gamepad0` … `Gamepad15` → first connected gamepad button index
 * - `StickLX`, `StickLY`, `StickRX`, `StickRY` → axis sign test via coordinator
 */
export class InputActionMap {
  constructor() {
    /** @type {Map<string, string[]>} */
    this._actions = new Map();
  }

  /**
   * @param {Record<string, unknown>} [inputConfig] root `input` block from game JSON
   */
  static fromConfig(inputConfig = {}) {
    const m = new InputActionMap();
    const actions = /** @type {Record<string, unknown>} */ (inputConfig.actions ?? {});
    for (const [name, val] of Object.entries(actions)) {
      if (Array.isArray(val)) {
        m._actions.set(name, val.map(String));
      } else if (val && typeof val === 'object' && Array.isArray((/** @type {Record<string, unknown>} */ (val)).keys)) {
        m._actions.set(name, (/** @type {string[]} */ ((/** @type {Record<string, unknown>} */ (val)).keys)).map(String));
      }
    }
    return m;
  }

  /**
   * @param {string} name
   * @returns {string[]}
   */
  getTokens(name) {
    return this._actions.get(String(name)) ?? [];
  }

  /**
   * @returns {string[]} action names
   */
  getActionNames() {
    return [...this._actions.keys()];
  }
}
