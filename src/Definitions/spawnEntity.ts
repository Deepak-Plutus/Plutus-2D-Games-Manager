import type * as PIXI from 'pixi.js';
import { TransformComponent } from '../Components/TransformComponent';
import { World } from '../Core/World';
import type { EntityBase } from '../Entities/EntityBase';
import type { EntityDefinition } from './GameDefinition';
import { componentRegistry, entityRegistry, prefabRegistry } from './registries';

export function spawnEntity(def: EntityDefinition, world: World, app: PIXI.Application): EntityBase | undefined {
  let entity: EntityBase | undefined;

  if (def.entityType) {
    const factory = entityRegistry[def.entityType];
    if (!factory) {
      console.warn(`[entityType] Unknown entityType "${def.entityType}" for "${def.id}"`);
    } else {
      entity = factory(app, def.props);
    }
  } else if (def.prefab) {
    const factory = prefabRegistry[def.prefab];
    if (!factory) {
      console.warn(`[prefab] Unknown prefab "${def.prefab}" for "${def.id}"`);
    } else {
      entity = factory(app);
    }
  }

  if (!entity) return undefined;

  world.createEntity(entity, def.id);
  app.stage.addChild(entity.view);

  // Default transform
  const transform = new TransformComponent();
  const pos = def.pos ?? [0, 0];
  transform.position.x = typeof pos[0] === 'number' ? pos[0] : 0;
  transform.position.y = typeof pos[1] === 'number' ? pos[1] : 0;
  world.addComponent(entity, transform);

  // JSON components
  for (const c of def.components ?? []) {
    const type = (c as any)?.type;
    if (typeof type !== 'string') continue;
    const factory = componentRegistry[type];
    if (!factory) {
      console.warn(`[component] Unknown component "${type}" on "${def.id}"`, c);
      continue;
    }
    factory(world, entity, c);
  }

  return entity;
}

