import type { Texture } from 'pixi.js'

/**
 * Runtime entry for loaded assets.
 */
export type AssetEntry = {
  kind: 'texture' | 'audio'
  url: string
  texture?: Texture
  audio?: HTMLAudioElement
  width?: number
  height?: number
}

/**
 * Keyed runtime store for already-loaded assets.
 */
export class AssetRegistry {
  private _byId: Map<string, AssetEntry>

  constructor () {
    this._byId = new Map()
  }

  /**
   * Stores or replaces an asset entry.
   *
   * @param {string} id Asset id.
   * @param {AssetEntry} entry Asset payload.
   * @returns {void} Nothing.
   */
  set (id: string, entry: AssetEntry): void {
    if (!id) return
    this._byId.set(id, entry)
  }

  /**
   * Fetches an asset by id.
   *
   * @param {string} id Asset id.
   * @returns {AssetEntry | undefined} Asset entry when found.
   */
  get (id: string): AssetEntry | undefined {
    return this._byId.get(id)
  }

  /**
   * Clears all registered assets.
   *
   * @returns {void} Nothing.
   */
  clear (): void {
    this._byId.clear()
  }
}
