/**
 * Layout layer names → base Z indices (Construct-style draw order).
 * @see https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/layers-and-layouts
 */
export class LayerTable {
  /**
   * @param {unknown[]} [layersList]
   */
  constructor(layersList = []) {
    /** @type {Map<string, { name: string, zIndex: number }>} */
    this._byName = new Map();
    const list = Array.isArray(layersList) ? layersList : [];
    let order = 0;
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const L = /** @type {Record<string, unknown>} */ (raw);
      const name = String(L.name ?? L.id ?? `Layer_${order}`);
      const z = L.zIndex != null ? Number(L.zIndex) : L.index != null ? Number(L.index) : order * 100;
      this._byName.set(name, { name, zIndex: z });
      order++;
    }
    if (!this._byName.size) {
      this._byName.set('Main', { name: 'Main', zIndex: 0 });
    }
  }

  /**
   * @param {string} layerName
   * @returns {{ name: string, zIndex: number }}
   */
  get(layerName) {
    return this._byName.get(String(layerName)) ?? this._byName.get('Main') ?? { name: 'Main', zIndex: 0 };
  }
}
