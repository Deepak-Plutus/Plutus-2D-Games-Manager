import { mergeDeep } from '../Core/mergeDeep.js'

type JsonRecord = Record<string, unknown>

export class ObjectTypeResolver {
  private _byId: Map<string, JsonRecord>

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

  get (typeId: string): JsonRecord | null {
    return this._byId.get(String(typeId)) ?? null
  }

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
