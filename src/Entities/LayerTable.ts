type LayerRecord = { name: string; zIndex: number }
type JsonRecord = Record<string, unknown>

/**
 * Resolves layer definitions to z-index records.
 */
export class LayerTable {
  private _byName: Map<string, LayerRecord>

  /**
   * @param {unknown[]} layersList Raw layers list from config.
   */
  constructor (layersList: unknown[] = []) {
    this._byName = new Map()
    const list = Array.isArray(layersList) ? layersList : []
    let order = 0
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue
      const L = raw as JsonRecord
      const name = String(L.name ?? L.id ?? `Layer_${order}`)
      const z =
        L.zIndex != null ? Number(L.zIndex) : L.index != null ? Number(L.index) : order * 100
      this._byName.set(name, { name, zIndex: z })
      order++
    }
    if (!this._byName.size) this._byName.set('Main', { name: 'Main', zIndex: 0 })
  }

  /**
   * Resolves a layer by name, falling back to `Main`.
   *
   * @param {string} layerName Layer name.
   * @returns {LayerRecord}
   */
  get (layerName: string): LayerRecord {
    return this._byName.get(String(layerName)) ?? this._byName.get('Main') ?? { name: 'Main', zIndex: 0 }
  }
}
