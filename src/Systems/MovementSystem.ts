import { System } from '../Core/System';
import type { World } from '../Core/World';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { TransformComponent } from '../Components/TransformComponent';
import { VelocityComponent } from '../Components/VelocityComponent';

export class MovementSystem extends System {
  update(dt: number, world: World): void {
    const state = world.getResource<{ current?: string }>('state');
    if (state?.current === 'paused') return;

    const s = dt / 1000;
    for (const [entity, transform, vel] of world.query(TransformComponent, VelocityComponent)) {
      // If physics is driving this entity, MovementSystem should not integrate it.
      if (world.hasComponent(entity, PhysicsBodyComponent)) continue;
      transform.position.x += vel.x * s;
      transform.position.y += vel.y * s;
    }
  }
}

