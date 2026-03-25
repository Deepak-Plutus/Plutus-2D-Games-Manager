import { LookAtComponent } from "../Components/LookAtComponent";
import { TransformComponent } from "../Components/TransformComponent";
import { System } from "../Core/System";
import type { World } from "../Core/World";
import { RES_ENTITIES, type EntitiesResource } from "./EntitiesManagementSystem";

export class LookAtSystem extends System {
  get singletonKey(): string {
    return "LookAtSystem";
  }

  update(dt: number, world: World): void {
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    if (!entities) return;

    for (const [_entity, lookAt, transform] of world.query(LookAtComponent, TransformComponent)) {
      let target = lookAt.targetPosition;
      if (lookAt.targetEntityName) {
        const targetEntity = entities.findByName(lookAt.targetEntityName);
        const targetTransform = targetEntity ? world.getComponent(targetEntity, TransformComponent) : undefined;
        if (targetTransform) target = targetTransform.position;
      }
      if (!target) continue;

      const desired = Math.atan2(target.y - transform.position.y, target.x - transform.position.x);
      lookAt.desiredRotation = desired;
      transform.rotation = moveAngleTowards(transform.rotation, desired, lookAt.rotationSpeed * (Math.max(0, dt) / 1000));
    }
  }
}

function moveAngleTowards(from: number, to: number, maxStep: number): number {
  const delta = shortestAngleDelta(from, to);
  if (Math.abs(delta) <= maxStep) return to;
  return from + Math.sign(delta) * maxStep;
}

function shortestAngleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

