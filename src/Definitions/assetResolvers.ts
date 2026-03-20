/**
 * Maps JSON IDs (prefab/background) to real file URLs served from /public.
 * Keep these mappings stable so AI-generated JSON can reference them.
 */

export function prefabTextureUrl(prefabId: string): string | undefined {
  switch (prefabId) {
    case 'sprite_hero_2d':
      return '/assets/sprites/sprite_hero_2d.png';
    case 'enemy_sprite_2d':
      return '/assets/sprites/enemy_sprite_2d.png';
    default:
      return undefined;
  }
}

export function backgroundTextureUrl(backgroundId: string): string | undefined {
  switch (backgroundId) {
    case 'parallax_hills_2d':
      return '/assets/backgrounds/parallax_hills_2d.png';
    default:
      return undefined;
  }
}

