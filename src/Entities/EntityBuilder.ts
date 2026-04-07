import type { Container } from 'pixi.js'
import { buildMetaRecord } from '../Components/Meta.js'
import { InstanceVariables } from '../Components/InstanceVariables.js'
import { Layer } from '../Components/Layer.js'
import { Transform } from '../Components/Transform.js'
import {
  COMPONENT_DISPLAY,
  COMPONENT_INSTANCE_VARIABLES,
  COMPONENT_LAYER,
  COMPONENT_META,
  COMPONENT_TRANSFORM
} from '../Components/index.js'
import { BehaviorRegistry } from '../Behaviors/BehaviorRegistry.js'
import type { AssetRegistry } from '../Core/AssetRegistry.js'
import { createPixiViewForEntity } from '../Core/PixiEntityDisplay.js'
import type { World } from '../ECS/World.js'
import { createDefaultComponentParserRegistry } from '../bootstrap/componentParsers.js'
import { ComponentParserRegistry } from '../bootstrap/ComponentParserRegistry.js'
import { LayerTable } from './LayerTable.js'
import { ObjectTypeResolver } from './ObjectTypeResolver.js'

type SpawnOptions = {
  objectTypes?: unknown[]
  layers?: unknown[]
}

type JsonRecord = Record<string, unknown>

/**
 * Spawns ECS entities from config instances and object type templates.
 */
export class EntityBuilder {
  private _behaviorRegistry: BehaviorRegistry
  private _componentParserRegistry: ComponentParserRegistry

  /**
   * @param {BehaviorRegistry} behaviorRegistry Behavior factory/registry.
   * @param {ComponentParserRegistry} componentParserRegistry Parser chain.
   */
  constructor (behaviorRegistry: BehaviorRegistry, componentParserRegistry: ComponentParserRegistry = createDefaultComponentParserRegistry()) {
    this._behaviorRegistry = behaviorRegistry
    this._componentParserRegistry = componentParserRegistry
  }

  /**
   * Spawns all entities from a config list.
   *
   * @param {World} world ECS world.
   * @param {unknown[]} entityList Raw entity list.
   * @param {AssetRegistry} registry Asset registry.
   * @param {Container} stage Stage container.
   * @param {SpawnOptions} options Spawn options.
   * @returns {void} Nothing.
   */
  spawnFromConfig (
    world: World,
    entityList: unknown[],
    registry: AssetRegistry,
    stage: Container,
    options: SpawnOptions = {}
  ): void {
    const list = Array.isArray(entityList) ? entityList : []
    const resolver = new ObjectTypeResolver(options.objectTypes)
    const layerTable = new LayerTable(options.layers)
    for (const raw of list) {
      if (!raw || typeof raw !== 'object') continue
      const instanceDef = raw as JsonRecord
      const { merged, objectType } = resolver.resolve(instanceDef)
      delete merged.type
      this._spawnOne(world, merged, objectType, registry, stage, layerTable)
    }
  }

  /**
   * Spawns one merged entity definition.
   *
   * @param {World} world ECS world.
   * @param {JsonRecord} merged Merged entity definition.
   * @param {string} objectType Resolved object type id.
   * @param {AssetRegistry} registry Asset registry.
   * @param {Container} stage Stage container.
   * @param {LayerTable} layerTable Layer resolver.
   * @returns {number}
   */
  private _spawnOne (
    world: World,
    merged: JsonRecord,
    objectType: string,
    registry: AssetRegistry,
    stage: Container,
    layerTable: LayerTable
  ): number {
    const entityId = world.createEntity()
    const meta = buildMetaRecord(merged, entityId, objectType)
    world.setComponent(entityId, COMPONENT_META, meta)
    const transform = Transform.fromJson((merged.transform ?? {}) as JsonRecord)
    world.setComponent(entityId, COMPONENT_TRANSFORM, transform)

    const layerName =
      typeof merged.layer === 'string'
        ? String(merged.layer)
        : merged.layer != null &&
            typeof merged.layer === 'object' &&
            !Array.isArray(merged.layer) &&
            (merged.layer as JsonRecord).name != null
          ? String((merged.layer as JsonRecord).name)
          : 'Main'
    const baseLayer = layerTable.get(layerName)
    const localZ =
      merged.zIndex != null
        ? Number(merged.zIndex)
        : merged.layer != null &&
            typeof merged.layer === 'object' &&
            !Array.isArray(merged.layer) &&
            (merged.layer as JsonRecord).zIndex != null
          ? Number((merged.layer as JsonRecord).zIndex)
          : 0
    world.setComponent(entityId, COMPONENT_LAYER, new Layer(baseLayer.name, baseLayer.zIndex + localZ))

    const iv = InstanceVariables.fromJson((merged.instanceVariables ?? {}) as JsonRecord)
    world.setComponent(entityId, COMPONENT_INSTANCE_VARIABLES, iv)

    // Parse authored components first (sprite/tiledSprite/etc.) so display creation has required data.
    this._componentParserRegistry.run({
      world,
      entityId,
      merged,
      behaviorRegistry: this._behaviorRegistry,
      registry,
      stage
    })

    const plugin = String(merged.plugin ?? meta.plugin ?? 'Sprite').toLowerCase()
    const skipDisplay = plugin === 'none' || plugin === 'logical' || plugin === 'invisible'
    if (!skipDisplay) {
      const view = createPixiViewForEntity(world, entityId, registry, stage)
      if (view) world.setComponent(entityId, COMPONENT_DISPLAY, { view })
    }

    return entityId
  }

  /**
   * Spawns one entity directly from a runtime instance definition.
   *
   * @param {World} world ECS world.
   * @param {AssetRegistry} registry Asset registry.
   * @param {Container} stage Stage container.
   * @param {SpawnOptions} spawnOptions Spawn options.
   * @param {JsonRecord} instanceDef Instance definition.
   * @returns {number}
   */
  spawnFromInstance (
    world: World,
    registry: AssetRegistry,
    stage: Container,
    spawnOptions: SpawnOptions,
    instanceDef: JsonRecord
  ): number {
    const resolver = new ObjectTypeResolver(spawnOptions.objectTypes ?? [])
    const layerTable = new LayerTable(spawnOptions.layers ?? [])
    const { merged, objectType } = resolver.resolve(instanceDef)
    const copy = { ...merged }
    delete copy.type
    return this._spawnOne(world, copy, objectType, registry, stage, layerTable)
  }
}
