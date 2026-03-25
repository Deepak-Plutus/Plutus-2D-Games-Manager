import { System } from "../Core/System";
import type { World } from "../Core/World";
import { HealthComponent } from "../Components/HealthComponent";
import { TagComponent } from "../Components/TagComponent";
import type { EntitiesResource } from "./EntitiesManagementSystem";
import { RES_ENTITIES } from "./EntitiesManagementSystem";

export const RES_HEALTH_API = "health_api";

export type HealthApi = {
  damage: (entityId: number, amount: number) => void;
  heal: (entityId: number, amount: number) => void;
  getHp: (entityId: number) => number | undefined;
};

/**
 * HealthSystem
 * - Applies kill/despawn when hp reaches 0
 * - Exposes a small health API for other systems/game scripts
 */
export class HealthSystem extends System {
  get singletonKey(): string {
    return "HealthSystem";
  }

  update(_dt: number, world: World): void {
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);

    if (!world.getResource<HealthApi>(RES_HEALTH_API)) {
      world.setResource<HealthApi>(RES_HEALTH_API, {
        damage: (entityId: number, amount: number) =>
          this.damage(world, entityId, amount),
        heal: (entityId: number, amount: number) =>
          this.heal(world, entityId, amount),
        getHp: (entityId: number) => this.getHp(world, entityId),
      });
    }

    for (const [entity, hp] of world.query(HealthComponent)) {
      if (hp.hp <= 0) {
        const tags = world.getComponent(entity, TagComponent);
        const isPlayer =
          entity.name === "hero" ||
          tags?.hasTag("player") === true ||
          tags?.hasTag("hero") === true;
        if (isPlayer) continue;
        entities?.despawnById(entity.id);
      }
    }
  }

  private damage(world: World, entityId: number, amount: number): void {
    if (amount <= 0) return;
    const entity = world.getEntity(entityId);
    if (!entity) return;
    const hp = world.getComponent(entity, HealthComponent);
    if (!hp) return;
    hp.hp = hp.hp - amount;
  }

  private heal(world: World, entityId: number, amount: number): void {
    if (amount <= 0) return;
    const entity = world.getEntity(entityId);
    if (!entity) return;
    const hp = world.getComponent(entity, HealthComponent);
    if (!hp) return;
    hp.hp = hp.hp + amount;
  }

  private getHp(world: World, entityId: number): number | undefined {
    const entity = world.getEntity(entityId);
    if (!entity) return undefined;
    return world.getComponent(entity, HealthComponent)?.hp;
  }
}
