import { Assets, Texture } from 'pixi.js';
import { AssetRegistry } from './AssetRegistry.js';

/**
 * Preloads image/audio assets into an {@link AssetRegistry}.
 */
export class AssetLoader {
  /**
   * @param {unknown[]} list
   * @param {AssetRegistry} registry
   * @param {(progress01: number, label: string) => void} [onProgress]
   */
  async loadAll(list, registry, onProgress) {
    const items = Array.isArray(list) ? list.filter((a) => a && a.id && a.url) : [];
    const total = items.length;
    let done = 0;

    const tick = (label) => {
      done += 1;
      const p = total ? done / total : 1;
      onProgress?.(p, label);
    };

    for (const def of items) {
      const type = (def.type || 'image').toLowerCase();
      const w = def.width != null ? Number(def.width) : undefined;
      const h = def.height != null ? Number(def.height) : undefined;

      if (type === 'audio') {
        const audio = await AssetLoader.#loadAudioElement(def.url);
        registry.set(def.id, {
          kind: 'audio',
          url: def.url,
          audio,
          width: w,
          height: h,
        });
        tick(`Audio: ${def.id}`);
        continue;
      }

      let texture;
      try {
        texture = await AssetLoader.#loadTexture(def.url);
      } catch {
        console.warn(`[AssetLoader] Failed to load image "${def.id}" (${def.url}); using Texture.WHITE`);
        texture = Texture.WHITE;
      }
      registry.set(def.id, {
        kind: 'texture',
        url: def.url,
        texture,
        width: w ?? texture.width,
        height: h ?? texture.height,
      });
      tick(`Image: ${def.id}`);
    }
  }

  /**
   * @param {string} url
   */
  static async #loadTexture(url) {
    if (typeof Assets?.load === 'function') {
      const res = await Assets.load(url);
      if (res instanceof Texture) return res;
      if (res?.texture) return res.texture;
    }
    return Texture.from(url);
  }

  /**
   * @param {string} url
   */
  static #loadAudioElement(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'auto';
      const onDone = () => {
        cleanup();
        resolve(audio);
      };
      const onErr = () => {
        cleanup();
        reject(new Error(`Failed to load audio: ${url}`));
      };
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', onDone);
        audio.removeEventListener('error', onErr);
      };
      audio.addEventListener('canplaythrough', onDone, { once: true });
      audio.addEventListener('error', onErr, { once: true });
      audio.src = url;
      audio.load();
    });
  }
}
