/**
 * Construct 3–style instance variables (per-instance data: number, string, boolean).
 * @see https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/objects/object-instance-variables
 */
export class InstanceVariables {
  /**
   * @param {Record<string, number | string | boolean>} [initial]
   */
  constructor(initial = {}) {
    /** @type {Record<string, number | string | boolean>} */
    this.values = { ...initial };
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    const out = {};
    if (!json || typeof json !== 'object') return new InstanceVariables(out);
    for (const [k, v] of Object.entries(json)) {
      if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
        out[k] = v;
      } else if (v != null && typeof v === 'object' && 'value' in (/** @type {object} */ (v))) {
        const val = (/** @type {Record<string, unknown>} */ (v)).value;
        if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
          out[k] = val;
        }
      }
    }
    return new InstanceVariables(out);
  }

  /**
   * @param {string} name
   * @returns {number | string | boolean | undefined}
   */
  get(name) {
    return this.values[name];
  }

  /**
   * @param {string} name
   * @param {number | string | boolean} value
   */
  set(name, value) {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      this.values[name] = value;
    }
  }

  /**
   * @param {Record<string, number | string | boolean>} partial
   */
  merge(partial) {
    Object.assign(this.values, partial);
  }
}
