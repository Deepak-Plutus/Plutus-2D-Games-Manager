/**
 * Construct 3–style layer + Z order for draw sorting (Pixi `zIndex` / child order).
 * @see https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/layers-and-layouts
 */
export class Layer {
  /**
   * @param {string} [name]
   * @param {number} [zIndex] global sort key (higher = on top)
   */
  constructor(name = 'Main', zIndex = 0) {
    this.name = String(name);
    this.zIndex = Number(zIndex) || 0;
  }

  /**
   * @param {Record<string, unknown>} [def]
   * @param {{ name?: string, zIndex?: number }} [layerDefaults] from layout layer table
   */
  static fromJson(def = {}, layerDefaults = {}) {
    const name = def.name != null ? String(def.name) : layerDefaults.name ?? 'Main';
    const z =
      def.zIndex != null
        ? Number(def.zIndex)
        : def.index != null
          ? Number(def.index)
          : layerDefaults.zIndex ?? 0;
    return new Layer(name, z);
  }
}
