import { Body } from "matter-js";
import { PhysicsBodyComponent } from "../Components/PhysicsBodyComponent";
import { TransformComponent } from "../Components/TransformComponent";
import { VelocityComponent } from "../Components/VelocityComponent";
import { WanderComponent } from "../Components/WanderComponent";
import { System } from "../Core/System";
import type { World } from "../Core/World";

export class WanderSystem extends System {
  get singletonKey(): string {
    return "WanderSystem";
  }

  update(dt: number, world: World): void {
    for (const [entity, wander, transform] of world.query(WanderComponent, TransformComponent)) {
      if (!wander._origin) wander._origin = { x: transform.position.x, y: transform.position.y };
      wander.updateWander(dt);

      // Keep movement roughly bounded around spawn point.
      const ox = wander._origin.x;
      const oy = wander._origin.y;
      const dx = transform.position.x - ox;
      const dy = transform.position.y - oy;
      if (Math.hypot(dx, dy) > wander.radius && wander.radius > 0) {
        wander._dir = { x: -dx / Math.max(1e-5, Math.hypot(dx, dy)), y: -dy / Math.max(1e-5, Math.hypot(dx, dy)) };
      }

      const vx = wander._dir.x * wander.speed;
      const vy = wander._dir.y * wander.speed;
      const phys = world.getComponent(entity, PhysicsBodyComponent);
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

