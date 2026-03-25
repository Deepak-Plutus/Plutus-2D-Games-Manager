import { Body } from "matter-js";
import { FollowTargetComponent } from "../Components/FollowTargetComponent";
import { PhysicsBodyComponent } from "../Components/PhysicsBodyComponent";
import { TransformComponent } from "../Components/TransformComponent";
import { VelocityComponent } from "../Components/VelocityComponent";
import { System } from "../Core/System";
import type { World } from "../Core/World";
import { RES_ENTITIES, type EntitiesResource } from "./EntitiesManagementSystem";

export class FollowTargetSystem extends System {
  get singletonKey(): string {
    return "FollowTargetSystem";
  }

  update(dt: number, world: World): void {
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    if (!entities) return;

    for (const [entity, follow, transform] of world.query(FollowTargetComponent, TransformComponent)) {
      follow.updateFollow(dt);
      const target = entities.findByName(follow.targetEntityName);
      if (!target) continue;
      const targetTx = world.getComponent(target, TransformComponent);
      if (!targetTx) continue;

      const dx = targetTx.position.x - transform.position.x;
      const dy = targetTx.position.y - transform.position.y;
      const dist = Math.hypot(dx, dy);

      const phys = world.getComponent(entity, PhysicsBodyComponent);
      if (dist <= follow.minDistance || dist <= 0.0001) {
        if (phys) {
          Body.setVelocity(phys.body, { x: 0, y: phys.body.velocity.y });
        } else {
          let vel = world.getComponent(entity, VelocityComponent);
          if (!vel) {
            vel = new VelocityComponent();
            world.addComponent(entity, vel);
          }
          vel.x = 0;
          vel.y = 0;
        }
        continue;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const vx = nx * follow.speed;
      const vy = ny * follow.speed;

      if (phys) {
        Body.setVelocity(phys.body, { x: vx, y: vy });
      } else {
        let vel = world.getComponent(entity, VelocityComponent);
        if (!vel) {
          vel = new VelocityComponent();
          world.addComponent(entity, vel);
        }
        vel.x = vx;
        vel.y = vy;
      }
    }
  }
}

