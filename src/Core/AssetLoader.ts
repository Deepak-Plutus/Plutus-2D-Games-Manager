import { Assets, Texture } from 'pixi.js'
import type { AssetRegistry } from './AssetRegistry.js'

type AssetDef = {
  id: string
  url: string
  type?: string
  width?: unknown
  height?: unknown
}

/**
 * Loads configured assets into an {@link AssetRegistry}.
 */
export class AssetLoader {
  /**
   * Loads all supported assets in sequence and reports progress.
   *
   * @param {unknown[]} list Raw asset definitions.
   * @param {AssetRegistry} registry Runtime registry to populate.
   * @param {(progress01: number, label: string) => void} [onProgress] Optional progress callback in [0,1].
   * @returns {Promise<void>} Resolves when all assets finish loading.
   * @example
   * await loader.loadAll(config.assets, registry, (p, label) => console.log(p, label))
   */
  async loadAll (
    list: unknown[],
    registry: AssetRegistry,
    onProgress?: (progress01: number, label: string) => void
  ): Promise<void> {
    const items = Array.isArray(list)
      ? (list.filter(a => a && (a as AssetDef).id && (a as AssetDef).url) as AssetDef[])
      : []
    const total = items.length
    let done = 0
    const tick = (label: string) => {
      done += 1
      const p = total ? done / total : 1
      onProgress?.(p, label)
    }

    for (const def of items) {
      const type = (def.type || 'image').toLowerCase()
      const w = def.width != null ? Number(def.width) : undefined
      const h = def.height != null ? Number(def.height) : undefined

      if (type === 'audio') {
        const audio = await AssetLoader.#loadAudioElement(def.url)
        registry.set(def.id, { kind: 'audio', url: def.url, audio, width: w, height: h })
        tick(`Audio: ${def.id}`)
        continue
      }

      let texture: Texture
      try {
        texture = await AssetLoader.#loadTexture(def.url)
      } catch {
        console.warn(`[AssetLoader] Failed to load image "${def.id}" (${def.url}); using Texture.WHITE`)
        texture = Texture.WHITE
      }
      registry.set(def.id, {
        kind: 'texture',
        url: def.url,
        texture,
        width: w ?? texture.width,
        height: h ?? texture.height
      })
      tick(`Image: ${def.id}`)
    }
  }

  /**
   * Loads a texture using Pixi Assets or fallback constructor.
   *
   * @param {string} url Texture URL.
   * @returns {Promise<Texture>} Loaded texture.
   */
  static async #loadTexture (url: string): Promise<Texture> {
    if (typeof Assets?.load === 'function') {
      const res = await Assets.load(url)
      if (res instanceof Texture) return res
      if ((res as { texture?: Texture })?.texture) return (res as { texture: Texture }).texture
    }
    return Texture.from(url)
  }

  /**
   * Loads audio into an HTMLAudioElement and resolves once playable.
   *
   * @param {string} url Audio URL.
   * @returns {Promise<HTMLAudioElement>} Loaded audio element.
   */
  static #loadAudioElement (url: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio()
      audio.preload = 'auto'
      const onDone = () => {
        cleanup()
        resolve(audio)
      }
      const onErr = () => {
        cleanup()
        reject(new Error(`Failed to load audio: ${url}`))
      }
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onDone)
        audio.removeEventListener('error', onErr)
      }
      audio.addEventListener('canplaythrough', onDone, { once: true })
      audio.addEventListener('error', onErr, { once: true })
      audio.src = url
      audio.load()
    })
  }
}
