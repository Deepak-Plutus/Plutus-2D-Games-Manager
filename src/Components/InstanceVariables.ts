type InstanceValue = number | string | boolean
type JsonRecord = Record<string, unknown>

/**
 * Dynamic per-entity key/value storage for game-specific state.
 */
export class InstanceVariables {
  values: Record<string, InstanceValue>

  constructor (initial: Record<string, InstanceValue> = {}) {
    this.values = { ...initial }
  }

  /**
   * Builds instance variable storage from raw JSON values.
   *
   * Accepts primitives directly or `{ value: primitive }` wrappers.
   *
   * @param {JsonRecord} json Raw instance variable block.
   * @returns {InstanceVariables}
   */
  static fromJson (json: JsonRecord = {}): InstanceVariables {
    const out: Record<string, InstanceValue> = {}
    if (!json || typeof json !== 'object') return new InstanceVariables(out)
    for (const [k, v] of Object.entries(json)) {
      if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
        out[k] = v
      } else if (v != null && typeof v === 'object' && 'value' in v) {
        const val = (v as JsonRecord).value
        if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') {
          out[k] = val
        }
      }
    }
    return new InstanceVariables(out)
  }

  /**
   * Gets a value by key.
   *
   * @param {string} name Variable key.
   * @returns {InstanceValue | undefined}
   */
  get (name: string): InstanceValue | undefined {
    return this.values[name]
  }

  /**
   * Sets a value when it is a supported primitive.
   *
   * @param {string} name Variable key.
   * @param {InstanceValue} value Primitive value.
   * @returns {void} Nothing.
   */
  set (name: string, value: InstanceValue): void {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      this.values[name] = value
    }
  }

  /**
   * Merges multiple values into storage.
   *
   * @param {Record<string, InstanceValue>} partial Partial value map.
   * @returns {void} Nothing.
   */
  merge (partial: Record<string, InstanceValue>): void {
    Object.assign(this.values, partial)
  }
}
