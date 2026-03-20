import { System } from '../Core/System';
import type { World } from '../Core/World';
import { PlatformSpawnerComponent } from '../Components/PlatformSpawnerComponent';
import { TransformComponent } from '../Components/TransformComponent';
import type { EntityDefinition } from '../Definitions/GameDefinition';
import { RES_ENTITIES, type EntitiesResource } from './EntitiesManagementSystem';

export class PlatformSpawnerSystem extends System {
  update(dt: number, world: World): void {
    const entitiesApi = world.getResource<EntitiesResource>(RES_ENTITIES);
    if (!entitiesApi) return;

    for (const [, spawner, transform] of world.query(PlatformSpawnerComponent, TransformComponent)) {
      const template = spawner.template;
      if (!template) continue;

      spawner.elapsedMs += Math.max(0, dt);
      if (spawner.elapsedMs < spawner.cooldownMs) continue;
      spawner.elapsedMs = 0;

      const alive = entitiesApi
        .all()
        .filter((e) => e.name.startsWith(`${spawner.spawnedPrefix}_`)).length;
      if (alive >= spawner.maxAlive) continue;

      spawner.counter += 1;
      const copy = structuredClone(template) as EntityDefinition;
      copy.id = `${spawner.spawnedPrefix}_${spawner.counter}`;

      const pos = Array.isArray(copy.pos) ? copy.pos : [transform.position.x, transform.position.y];
      copy.pos = [
        typeof pos[0] === 'number' ? pos[0] : transform.position.x,
        typeof pos[1] === 'number' ? pos[1] : transform.position.y,
      ];

      entitiesApi.spawn(copy);
    }
  }
}
