type LayerRecord = { name: string; zIndex: number }
type JsonRecord = Record<string, unknown>

export class LayerTable {
  private _byName: Map<string, LayerRecord>

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

  get (layerName: string): LayerRecord {
    return this._byName.get(String(layerName)) ?? this._byName.get('Main') ?? { name: 'Main', zIndex: 0 }
  }
}
