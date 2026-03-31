import { mergeDeep } from '../Core/mergeDeep.js';

/**
 * Resolves Construct-style `objectTypes` templates by `id` (type name).
 * @see https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/objects
 */
export class ObjectTypeResolver {
  /**
   * @param {unknown[]} [objectTypesList]
   */
  constructor(objectTypesList = []) {
    /** @type {Map<string, Record<string, unknown>>} */
    this._byId = new Map();
    const list = Array.isArray(objectTypesList) ? objectTypesList : [];
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const t = /** @type {Record<string, unknown>} */ (raw);
      const key = t.id != null ? String(t.id) : t.typeId != null ? String(t.typeId) : '';
      if (!key) continue;
      this._byId.set(key, t);
    }
  }

  /**
   * @param {string} typeId
   * @returns {Record<string, unknown> | null}
   */
  get(typeId) {
    return this._byId.get(String(typeId)) ?? null;
  }

  /**
   * Merge object type defaults with an instance definition (instance wins).
   * Template `id` / `typeId` are not copied onto the instance.
   * @param {Record<string, unknown>} instanceDef
   * @returns {{ merged: Record<string, unknown>, objectType: string }}
   */
  resolve(instanceDef) {
    const typeKey =
      instanceDef.type != null
        ? String(instanceDef.type)
        : instanceDef.objectType != null
          ? String(instanceDef.objectType)
          : '';
    if (!typeKey) {
      return { merged: { ...instanceDef }, objectType: '' };
    }
    const template = this._byId.get(typeKey);
    if (!template) {
      return { merged: { ...instanceDef }, objectType: typeKey };
    }
    const { id: _tid, typeId: _tid2, type: _tt, ...base } = template;
    const merged = mergeDeep({}, base, instanceDef);
    merged.objectType = typeKey;
    return { merged, objectType: typeKey };
  }
}
