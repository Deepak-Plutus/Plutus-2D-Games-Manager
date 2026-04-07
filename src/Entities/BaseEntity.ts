import type { Container } from 'pixi.js'
import { mountPixiDisplayForEntity } from '../Core/PixiEntityDisplay.js'
import { COMPONENT_TRANSFORM } from '../Components/index.js'
import type { AssetRegistry } from '../Core/AssetRegistry.js'
import type { Transform } from '../Components/Transform.js'
import type { World } from '../ECS/World.js'

export class BaseEntity {
  world: World
  id: number

  constructor (world: World, entityId: number) {
    this.world = world
    this.id = entityId
  }

  static wrap (world: World, entityId: number): BaseEntity {
    return new BaseEntity(world, entityId)
  }

  getTransform (): Transform | undefined {
    return this.world.getComponent<Transform>(this.id, COMPONENT_TRANSFORM)
  }

  attach (componentKey: string, data: unknown): this {
    this.world.setComponent(this.id, componentKey, data)
    return this
  }

  get<T = unknown> (componentKey: string): T | undefined {
    return this.world.getComponent<T>(this.id, componentKey)
  }

  has (componentKey: string): boolean {
    return this.world.entities.get(this.id)?.components.has(componentKey) ?? false
  }

  remove (componentKey: string): this {
    this.world.removeComponent(this.id, componentKey)
    return this
  }

  destroy (): void {
    this.world.destroyEntity(this.id)
  }

  mountPixiDisplay (registry: AssetRegistry, stage: Container): this {
    mountPixiDisplayForEntity(this.world, this.id, registry, stage)
    return this
  }
}
