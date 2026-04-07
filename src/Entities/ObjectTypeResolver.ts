import { mergeDeep } from '../Core/mergeDeep.js'

type JsonRecord = Record<string, unknown>

/**
 * Resolves object type templates and merges them with instance overrides.
 */
export class ObjectTypeResolver {
  private _byId: Map<string, JsonRecord>

  /**
   * @param {unknown[]} objectTypesList Object type template list.
   */
  constructor (objectTypesList: unknown[] = []) {
    this._byId = new Map()
    const list = Array.isArray(objectTypesList) ? objectTypesList : []
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue
      const t = raw as JsonRecord
      const key = t.id != null ? String(t.id) : t.typeId != null ? String(t.typeId) : ''
      if (!key) continue
      this._byId.set(key, t)
    }
  }

  /**
   * Returns raw type template by id.
   *
   * @param {string} typeId Type id.
   * @returns {JsonRecord | null}
   */
  get (typeId: string): JsonRecord | null {
    return this._byId.get(String(typeId)) ?? null
  }

  /**
   * Produces merged instance data using template + instance override.
   *
   * @param {JsonRecord} instanceDef Raw instance definition.
   * @returns {{ merged: JsonRecord; objectType: string }}
   */
  resolve (instanceDef: JsonRecord): { merged: JsonRecord; objectType: string } {
    const typeKey =
      instanceDef.type != null
        ? String(instanceDef.type)
        : instanceDef.objectType != null
          ? String(instanceDef.objectType)
          : ''
    if (!typeKey) return { merged: { ...instanceDef }, objectType: '' }
    const template = this._byId.get(typeKey)
    if (!template) return { merged: { ...instanceDef }, objectType: typeKey }
    const { id: _tid, typeId: _tid2, type: _tt, ...base } = template
    const merged = mergeDeep({}, base, instanceDef) as JsonRecord
    merged.objectType = typeKey
    return { merged, objectType: typeKey }
  }
}
