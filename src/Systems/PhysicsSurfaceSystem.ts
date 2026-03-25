import { Body, Vector } from "matter-js";
import { FrictionComponent } from "../Components/FrictionComponent";
import { GravityComponent } from "../Components/GravityComponent";
import { PhysicsBodyComponent } from "../Components/PhysicsBodyComponent";
import { System } from "../Core/System";
import type { World } from "../Core/World";

export class PhysicsSurfaceSystem extends System {
  get singletonKey(): string {
    return "PhysicsSurfaceSystem";
  }

  update(dt: number, world: World): void {
    for (const [entity, body] of world.query(PhysicsBodyComponent)) {
      const gravity = world.getComponent(entity, GravityComponent);
      if (gravity) gravity.applyGravity(dt, body);

      const friction = world.getComponent(entity, FrictionComponent);
      if (friction && !body.body.isStatic) {
        const v = friction.applyFriction(body.body.velocity, dt);
        Body.setVelocity(body.body, Vector.create(v.x, v.y));
      }
    }
  }
}

