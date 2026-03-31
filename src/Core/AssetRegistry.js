/**
 * @typedef {object} AssetEntry
 * @property {'texture' | 'audio'} kind
 * @property {string} url
 * @property {import('pixi.js').Texture} [texture]
 * @property {HTMLAudioElement} [audio]
 * @property {number} [width]  display width in app pixels (from JSON)
 * @property {number} [height] display height in app pixels (from JSON)
 */

/**
 * In-memory store for loaded assets, keyed by JSON `id` (keyword).
 * Each entry keeps app-space dimensions from JSON where applicable.
 */
export class AssetRegistry {
  constructor() {
    /** @type {Map<string, AssetEntry>} */
    this._byId = new Map();
  }

  /**
   * @param {string} id
   * @param {AssetEntry} entry
   */
  set(id, entry) {
    if (!id) return;
    this._byId.set(id, entry);
  }

  /**
   * @param {string} id
   * @returns {AssetEntry | undefined}
   */
  get(id) {
    return this._byId.get(id);
  }

  clear() {
    this._byId.clear();
  }
}
