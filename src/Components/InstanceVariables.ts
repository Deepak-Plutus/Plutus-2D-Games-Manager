type InstanceValue = number | string | boolean
type JsonRecord = Record<string, unknown>

export class InstanceVariables {
  values: Record<string, InstanceValue>

  constructor (initial: Record<string, InstanceValue> = {}) {
    this.values = { ...initial }
  }

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

  get (name: string): InstanceValue | undefined {
    return this.values[name]
  }

  set (name: string, value: InstanceValue): void {
    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      this.values[name] = value
    }
  }

  merge (partial: Record<string, InstanceValue>): void {
    Object.assign(this.values, partial)
  }
}
