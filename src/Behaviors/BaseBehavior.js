/**
 * Construct-style behavior: enabled flag, JSON-backed properties, actions (methods), expressions (getters).
 */
export class BaseBehavior {
  /** @type {string} */
  static type = 'base';

  /** @type {Record<string, unknown>} */
  static defaultProperties = {};

  /** Lower runs first (movement before constraints like Bound). */
  static priority = 50;

  /** @type {boolean} */
  #enabled = true;

  /**
   * @param {Record<string, unknown>} [json] merged onto {@link BaseBehavior.defaultProperties}
   */
  constructor(json = {}) {
    this.#enabled = json.enabled !== false;
    this._applyPropertyDefaults();
    this.applyJsonProperties(json);
  }

  _applyPropertyDefaults() {
    const C = /** @type {typeof BaseBehavior} */ (this.constructor);
    const defs = C.defaultProperties;
    for (const key of Object.keys(defs)) {
      if (this[key] === undefined) {
        const v = defs[key];
        this[key] = typeof v === 'object' && v !== null && !Array.isArray(v) ? structuredClone(v) : v;
      }
    }
  }

  /**
   * Override in subclasses to map JSON keys onto fields (after defaults).
   * @param {Record<string, unknown>} json
   */
  applyJsonProperties(json) {}

  get enabled() {
    return this.#enabled;
  }

  set enabled(v) {
    this.#enabled = !!v;
  }

  isEnabled() {
    return this.#enabled;
  }

  setEnabled(value) {
    this.#enabled = !!value;
  }

  /**
   * If non-null, {@link EntityBuilder} writes {@link import('../Components/index.js').COMPONENT_COLLISION}.
   * @returns {null | { kind: string, width: number, height: number, offsetX: number, offsetY: number }}
   */
  getCollisionContribution() {
    return null;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} _ctx
   */
  tick(_ctx) {}
}
