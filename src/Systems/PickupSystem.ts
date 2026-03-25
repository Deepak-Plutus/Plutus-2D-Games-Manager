import { Events } from "matter-js";
import { System } from "../Core/System";
import type { World } from "../Core/World";
import type { PhysicsState } from "./PhysicsSystem";
import { RES_PHYSICS } from "./PhysicsSystem";
import { PickupComponent } from "../Components/PickupComponent";
import { HealthComponent } from "../Components/HealthComponent";
import type { EntitiesResource } from "./EntitiesManagementSystem";
import { RES_ENTITIES } from "./EntitiesManagementSystem";
import type { AudioApi } from "./AudioSystem";
import { RES_AUDIO_API } from "./AudioSystem";

export class PickupSystem extends System {
  get singletonKey(): string {
    return "PickupSystem";
  }

  private attached = false;

  update(_dt: number, world: World): void {
    if (!this.attached) {
      const phys = world.getResource<PhysicsState>(RES_PHYSICS);
      if (!phys) return;
      this.attach(phys, world);
      this.attached = true;
    }
  }

  private attach(phys: PhysicsState, world: World): void {
    Events.on(phys.engine, "collisionStart", (evt) => {
      for (const pair of evt.pairs) {
        this.tryPickup(world, pair.bodyA, pair.bodyB);
        this.tryPickup(world, pair.bodyB, pair.bodyA);
      }
    });
  }

  private tryPickup(world: World, pickupBody: any, otherBody: any): void {
    const pickupId = pickupBody?.plugin?.entityId;
    const otherId = otherBody?.plugin?.entityId;
    if (typeof pickupId !== "number" || typeof otherId !== "number") return;

    const pickupEnt = world.getEntity(pickupId);
    const otherEnt = world.getEntity(otherId);
    if (!pickupEnt || !otherEnt) return;

    const pickup = world.getComponent(pickupEnt, PickupComponent);
    if (!pickup) return;
    if (pickup.picked) return;

    if (pickup.targetEntityName && otherEnt.name !== pickup.targetEntityName) return;

    // Apply effect to a HealthComponent if we can.
    const health = world.getComponent(otherEnt, HealthComponent);
    const soundId = pickup.soundId;

    // Call doc-style hooks.
    pickup.onPickup(health ?? otherEnt);

    if (soundId) {
      const audio = world.getResource<AudioApi>(RES_AUDIO_API);
      audio?.play(soundId);
    }

    if (pickup.destroyAfter) {
      const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
      entities?.despawnById(pickupEnt.id);
    }
  }
}

