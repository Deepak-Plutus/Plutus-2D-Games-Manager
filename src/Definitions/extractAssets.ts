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
    const bgUrl = resolveBackgroundUrl(bg);
    if (bgUrl) urls.add(bgUrl);
  }

  // Optional world-level prefab IDs used by systems for dynamic spawns.
  const worldEnemyPrefab = (def.world as any)?.enemyPrefab;
  if (typeof worldEnemyPrefab === 'string') {
    const url = prefabTextureUrl(worldEnemyPrefab);
    if (url) urls.add(url);
  }
  const worldBossPrefab = (def.world as any)?.bossPrefab;
  if (typeof worldBossPrefab === 'string') {
    const url = prefabTextureUrl(worldBossPrefab);
    if (url) urls.add(url);
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

function resolveBackgroundUrl(background: string): string | undefined {
  const resolved = backgroundTextureUrl(background);
  if (resolved) return resolved;
  if (background.includes('/') || background.includes('.')) return background;
  return `/assets/backgrounds/${background}.png`;
}

