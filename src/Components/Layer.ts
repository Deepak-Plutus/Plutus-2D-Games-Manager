type JsonRecord = Record<string, unknown>

export class Layer {
  name: string
  zIndex: number

  constructor (name = 'Main', zIndex = 0) {
    this.name = String(name)
    this.zIndex = Number(zIndex) || 0
  }

  static fromJson (
    def: JsonRecord = {},
    layerDefaults: { name?: string; zIndex?: number } = {}
  ): Layer {
    const name = def.name != null ? String(def.name) : layerDefaults.name ?? 'Main'
    const z =
      def.zIndex != null
        ? Number(def.zIndex)
        : def.index != null
          ? Number(def.index)
          : layerDefaults.zIndex ?? 0
    return new Layer(name, z)
  }
}
