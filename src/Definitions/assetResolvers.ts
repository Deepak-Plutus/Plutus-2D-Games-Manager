/**
 * Maps JSON IDs (prefab/background) to real file URLs served from /public.
 * Keep these mappings stable so AI-generated JSON can reference them.
 */

export function prefabTextureUrl(prefabId: string): string | undefined {
  switch (prefabId) {
    case "sprite_hero_2d":
      return "/assets/sprites/sprite_hero_2d.png";
    case "shooter_player":
      return "/assets/sprites/shooter_player.png";
    case "topdown_human_2d":
      return "/assets/sprites/sprite_hero_2d.png";
    case "enemy_sprite_2d":
      return "/assets/sprites/enemy_sprite_2d.png";
    case "enemy_ship":
      return "/assets/sprites/enemy_ship.png";
    case "boss_enemy_ship":
      return "/assets/sprites/boss_enemy_ship.png";
    case "spaceship_2d":
      return "/assets/sprites/spaceship_2d.png";
    default:
      console.log("Unknown prefab:", prefabId, ", Using Fallback Image");
      return "/assets/sprites/sprite_hero_2d.png";
  }
}

export function backgroundTextureUrl(backgroundId: string): string | undefined {
  switch (backgroundId) {
    case "parallax_hills_2d":
      return "/assets/backgrounds/parallax_hills_2d.png";
    case "space_bullet_hell_bg":
      return "/assets/backgrounds/SpacebulletHellBackground.png";
    default:
      return undefined;
  }
}
