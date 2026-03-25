import { LifetimeComponent } from "../Components/LifetimeComponent";
import { System } from "../Core/System";
import type { World } from "../Core/World";
import { RES_ENTITIES, type EntitiesResource } from "./EntitiesManagementSystem";
import { RES_STATE_API, type StateApi } from "./StateManagementSystem";

export class LifetimeSystem extends System {
  get singletonKey(): string {
    return "LifetimeSystem";
  }

  update(dt: number, world: World): void {
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    const stateApi = world.getResource<StateApi>(RES_STATE_API);
    if (!entities) return;
    if (stateApi?.is("paused") ?? false) return;

    for (const [entity, lifetime] of world.query(LifetimeComponent)) {
      lifetime.updateLifetime(dt);
      if (!lifetime.destroyWhenExpired()) continue;

      entities.despawnById(entity.id);
      // consume one-shot flag in case despawn is deferred
      lifetime._destroyOnExpire = false;
    }
  }
}

