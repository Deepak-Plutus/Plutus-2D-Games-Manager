import type { Texture } from 'pixi.js'

export type AssetEntry = {
  kind: 'texture' | 'audio'
  url: string
  texture?: Texture
  audio?: HTMLAudioElement
  width?: number
  height?: number
}

export class AssetRegistry {
  private _byId: Map<string, AssetEntry>

  constructor () {
    this._byId = new Map()
  }

  set (id: string, entry: AssetEntry): void {
    if (!id) return
    this._byId.set(id, entry)
  }

  get (id: string): AssetEntry | undefined {
    return this._byId.get(id)
  }

  clear (): void {
    this._byId.clear()
  }
}
