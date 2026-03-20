import type { GameDefinition } from './GameDefinition';
import { backgroundTextureUrl, prefabTextureUrl } from './assetResolvers';

/**
 * Very small, extensible asset discovery pass over the JSON definition.
 * - `props.texture` direct URLs
 * - prefab IDs -> texture URLs
 * - background IDs -> texture URLs
 */
export function extractAssetUrls(def: GameDefinition): string[] {
  const urls = new Set<string>();

  const bg = def.world?.background;
  if (typeof bg === 'string') {
    const bgUrl = backgroundTextureUrl(bg);
    if (bgUrl) urls.add(bgUrl);
  }

  for (const e of def.entities ?? []) {
    const texture = e.props?.texture;
    if (typeof texture === 'string' && texture.length > 0) urls.add(texture);

    if (typeof e.prefab === 'string') {
      const url = prefabTextureUrl(e.prefab);
      if (url) urls.add(url);
    }
  }

  return [...urls];
}

