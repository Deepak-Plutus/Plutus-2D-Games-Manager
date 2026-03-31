import { buildMetaRecord } from '../Components/Meta.js';
import { InstanceVariables } from '../Components/InstanceVariables.js';
import { Layer } from '../Components/Layer.js';
import { Transform } from '../Components/Transform.js';
import {
  COMPONENT_BEHAVIORS,
  COMPONENT_COLLISION,
  COMPONENT_DISPLAY,
  COMPONENT_INSTANCE_VARIABLES,
  COMPONENT_LAYER,
  COMPONENT_META,
  COMPONENT_TRANSFORM,
} from '../Components/index.js';
import { BehaviorRegistry } from '../Behaviors/BehaviorRegistry.js';
import { AssetRegistry } from '../Core/AssetRegistry.js';
import { createPixiViewForEntity } from '../Core/PixiEntityDisplay.js';
import { World } from '../ECS/World.js';
import { LayerTable } from './LayerTable.js';
import { ObjectTypeResolver } from './ObjectTypeResolver.js';
import { attachGameComponents } from './attachGameComponents.js';

/**
 * Builds ECS entities from JSON (Construct 3–style `objectTypes` + layout instances).
 *
 * @typedef {object} SpawnOptions
 * @property {unknown[]} [objectTypes] template definitions keyed by `id` or `typeId`
 * @property {unknown[]} [layers] `{ name, zIndex }` draw order
 */

/**
 * Builds ECS entities from JSON definitions and attaches Pixi display objects.
 */
export class EntityBuilder {
  /**
   * @param {BehaviorRegistry} behaviorRegistry
   */
  constructor(behaviorRegistry) {
    this._behaviorRegistry = behaviorRegistry;
  }

  /**
   * @param {World} world
   * @param {unknown[]} entityList
   * @param {AssetRegistry} registry
   * @param {import('pixi.js').Container} stage
   * @param {SpawnOptions} [options]
   */
  spawnFromConfig(world, entityList, registry, stage, options = {}) {
    const list = Array.isArray(entityList) ? entityList : [];
    const resolver = new ObjectTypeResolver(options.objectTypes);
    const layerTable = new LayerTable(options.layers);

    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue;
      const instanceDef = /** @type {Record<string, unknown>} */ (raw);
      const { merged, objectType } = resolver.resolve(instanceDef);
      delete merged.type;
      this._spawnOne(world, merged, objectType, registry, stage, layerTable);
    }
  }

  /**
   * @param {World} world
   * @param {Record<string, unknown>} merged
   * @param {string} objectType
   * @param {AssetRegistry} registry
   * @param {import('pixi.js').Container} stage
   * @param {LayerTable} layerTable
   */
  _spawnOne(world, merged, objectType, registry, stage, layerTable) {
    const entityId = world.createEntity();

    const meta = buildMetaRecord(merged, entityId, objectType);
    world.setComponent(entityId, COMPONENT_META, meta);

    const transform = Transform.fromJson(
      /** @type {Record<string, unknown>} */ (merged.transform ?? {}),
    );
    world.setComponent(entityId, COMPONENT_TRANSFORM, transform);

    const layerName =
      merged.layer != null && typeof merged.layer === 'string'
        ? String(merged.layer)
        : merged.layer != null &&
            typeof merged.layer === 'object' &&
            !Array.isArray(merged.layer) &&
            (/** @type {Record<string, unknown>} */ (merged.layer)).name != null
          ? String((/** @type {Record<string, unknown>} */ (merged.layer)).name)
          : 'Main';
    const baseLayer = layerTable.get(layerName);
    const localZ =
      merged.zIndex != null
        ? Number(merged.zIndex)
        : merged.layer != null &&
            typeof merged.layer === 'object' &&
            !Array.isArray(merged.layer) &&
            (/** @type {Record<string, unknown>} */ (merged.layer)).zIndex != null
          ? Number((/** @type {Record<string, unknown>} */ (merged.layer)).zIndex)
          : 0;
    const layer = new Layer(baseLayer.name, baseLayer.zIndex + localZ);
    world.setComponent(entityId, COMPONENT_LAYER, layer);

    const iv = InstanceVariables.fromJson(
      /** @type {Record<string, unknown>} */ (merged.instanceVariables ?? {}),
    );
    world.setComponent(entityId, COMPONENT_INSTANCE_VARIABLES, iv);

    attachGameComponents(world, entityId, merged);

    const plugin = String(merged.plugin ?? meta.plugin ?? 'Sprite').toLowerCase();
    const skipDisplay = plugin === 'none' || plugin === 'logical' || plugin === 'invisible';

    if (!skipDisplay) {
      const view = createPixiViewForEntity(world, entityId, registry, stage);
      if (view) {
        world.setComponent(entityId, COMPONENT_DISPLAY, { view });
      }
    }

    const instances = Array.isArray(merged.behaviors)
      ? this._behaviorRegistry.createFromJsonArray(merged.behaviors)
      : [];
    if (instances.length) {
      world.setComponent(entityId, COMPONENT_BEHAVIORS, instances);
    }

    for (const b of instances) {
      const contrib =
        typeof b.getCollisionContribution === 'function' ? b.getCollisionContribution() : null;
      if (contrib) {
        world.setComponent(entityId, COMPONENT_COLLISION, {
          kind: contrib.kind,
          width: contrib.width,
          height: contrib.height,
          offsetX: contrib.offsetX,
          offsetY: contrib.offsetY,
        });
      }
    }

    const colDef = merged.collision;
    if (colDef && typeof colDef === 'object') {
      const c = /** @type {Record<string, unknown>} */ (colDef);
      world.setComponent(entityId, COMPONENT_COLLISION, {
        kind: String(c.kind ?? 'solid'),
        width: Number(c.width) || 0,
        height: Number(c.height) || 0,
        offsetX: Number(c.offsetX) || 0,
        offsetY: Number(c.offsetY) || 0,
      });
    }
    return entityId;
  }

  /**
   * Spawn one instance from an object type + instance override (same shape as layout JSON entries).
   * @param {World} world
   * @param {import('../Core/AssetRegistry.js').AssetRegistry} registry
   * @param {import('pixi.js').Container} stage
   * @param {SpawnOptions} spawnOptions
   * @param {Record<string, unknown>} instanceDef must include `type` (object type id)
   * @returns {number} entity id
   */
  spawnFromInstance(world, registry, stage, spawnOptions, instanceDef) {
    const resolver = new ObjectTypeResolver(spawnOptions.objectTypes ?? []);
    const layerTable = new LayerTable(spawnOptions.layers ?? []);
    const { merged, objectType } = resolver.resolve(
      /** @type {Record<string, unknown>} */ (instanceDef),
    );
    const copy = { ...merged };
    delete copy.type;
    return this._spawnOne(world, copy, objectType, registry, stage, layerTable);
  }
}
