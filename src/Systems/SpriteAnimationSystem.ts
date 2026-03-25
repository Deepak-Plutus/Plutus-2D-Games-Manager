import * as PIXI from 'pixi.js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { SpriteAnimationComponent } from '../Components/SpriteAnimationComponent';

/**
 * SpriteAnimationSystem
 * - If an entity's view is a PIXI.AnimatedSprite, it updates + controls playback.
 * - Animation frames are expected to be provided by the entity type (SpriteAnimation) using PIXI.Texture.from(url).
 *
 * Note: Pixi's AnimatedSprite can auto-update via a ticker, but this ensures
 * animation is deterministic with the engine's dt.
 */
export class SpriteAnimationSystem extends System {
  get singletonKey(): string {
    return 'SpriteAnimationSystem';
  }

  update(dt: number, world: World): void {
    for (const [entity, anim] of world.query(SpriteAnimationComponent)) {
      anim.update(dt);
      const view = entity.view;
      if (!(view instanceof PIXI.AnimatedSprite)) continue;

      view.loop = anim.loop;
      view.animationSpeed = Math.max(0, anim.fps) / 60; // fps -> pixi speed (per tick @60hz)
      if (view.totalFrames > 0 && view.currentFrame !== anim.currentFrame) {
        view.gotoAndStop(anim.currentFrame);
      }

      if (anim.playing && !view.playing) view.play();
      if (!anim.playing && view.playing) view.stop();
    }
  }
}

