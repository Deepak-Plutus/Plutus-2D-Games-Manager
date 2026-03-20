import { System } from '../Core/System';
import type { World } from '../Core/World';
import { AnimationStateComponent } from '../Components/AnimationStateComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { SpriteEntity } from '../Entities/SpriteEntity';
import { VelocityComponent } from '../Components/VelocityComponent';

/**
 * Minimal AnimationSystem
 * For now it just switches AnimationState idle/run based on velocity,
 * and applies a tiny visual change so you can see it working.
 */
export class AnimationSystem extends System {
  update(_dt: number, world: World): void {
    for (const [entity, anim] of world.query(AnimationStateComponent)) {
      let vx = 0;

      const vel = world.getComponent(entity, VelocityComponent);
      if (vel) vx = vel.x;

      const phys = world.getComponent(entity, PhysicsBodyComponent);
      if (phys) vx = phys.body.velocity.x;

      const next = Math.abs(vx) > 0.2 ? 'run' : 'idle';
      anim.current = next;

      // Visual feedback: slightly brighten when running
      if (entity instanceof SpriteEntity) {
        entity.sprite.alpha = next === 'run' ? 1 : 0.92;
        if (vx !== 0) entity.sprite.scale.x = Math.sign(vx) * Math.abs(entity.sprite.scale.x || 1);
      }
    }
  }
}

