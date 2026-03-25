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
  // JSON patrol speed is treated as a design value; this maps it to runtime velocity.
  private readonly patrolSpeedScalePhysics = 3.5;
  private readonly patrolSpeedScaleKinematic = 120;

  update(_dt: number, world: World): void {
    const state = world.getResource<{ current?: string }>('state');
    if (state?.current === 'paused') return;

    for (const [entity, patrol, transform] of world.query(PatrolBehaviorComponent, TransformComponent)) {
      patrol.updatePatrol(_dt);
      if (patrol.startX === undefined) patrol.startX = transform.position.x;

      const minX = patrol.startX - patrol.range;
      const maxX = patrol.startX + patrol.range;

      if (transform.position.x <= minX && patrol.dir < 0) patrol.reverseDirection();
      if (transform.position.x >= maxX && patrol.dir > 0) patrol.reverseDirection();

      const phys = world.getComponent(entity, PhysicsBodyComponent);
      const targetVx = patrol.dir * patrol.speed * (phys ? this.patrolSpeedScalePhysics : this.patrolSpeedScaleKinematic);

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

