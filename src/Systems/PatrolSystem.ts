import { Body } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { PatrolBehaviorComponent } from '../Components/PatrolBehaviorComponent';
import { TransformComponent } from '../Components/TransformComponent';
import { VelocityComponent } from '../Components/VelocityComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';

/**
 * PatrolSystem
 * Moves an entity back and forth within a range.
 * - If PhysicsBody exists: sets Matter velocity.x
 * - Else: ensures VelocityComponent and sets velocity.x
 */
export class PatrolSystem extends System {
  update(_dt: number, world: World): void {
    const state = world.getResource<{ current?: string }>('state');
    if (state?.current === 'paused') return;

    for (const [entity, patrol, transform] of world.query(PatrolBehaviorComponent, TransformComponent)) {
      if (patrol.startX === undefined) patrol.startX = transform.position.x;

      const minX = patrol.startX - patrol.range;
      const maxX = patrol.startX + patrol.range;

      if (transform.position.x <= minX) patrol.dir = 1;
      if (transform.position.x >= maxX) patrol.dir = -1;

      const targetVx = patrol.dir * patrol.speed;

      const phys = world.getComponent(entity, PhysicsBodyComponent);
      if (phys) {
        Body.setVelocity(phys.body, { x: targetVx, y: phys.body.velocity.y });
      } else {
        let vel = world.getComponent(entity, VelocityComponent);
        if (!vel) {
          vel = new VelocityComponent();
          world.addComponent(entity, vel);
        }
        vel.x = targetVx;
      }
    }
  }
}

