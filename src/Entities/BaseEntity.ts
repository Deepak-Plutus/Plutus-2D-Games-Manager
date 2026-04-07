import type { Container } from 'pixi.js'
import { mountPixiDisplayForEntity } from '../Core/PixiEntityDisplay.js'
import { COMPONENT_TRANSFORM } from '../Components/index.js'
import type { AssetRegistry } from '../Core/AssetRegistry.js'
import type { Transform } from '../Components/Transform.js'
import type { World } from '../ECS/World.js'

/**
 * Thin convenience wrapper around an ECS entity id.
 */
export class BaseEntity {
  world: World
  id: number

  /**
   * @param {World} world ECS world.
   * @param {number} entityId Existing entity id.
   */
  constructor (world: World, entityId: number) {
    this.world = world
    this.id = entityId
  }

  /**
   * Creates a wrapped entity helper from id.
   *
   * @param {World} world ECS world.
   * @param {number} entityId Entity id.
   * @returns {BaseEntity}
   */
  static wrap (world: World, entityId: number): BaseEntity {
    return new BaseEntity(world, entityId)
  }

  /**
   * Gets transform component if present.
   *
   * @returns {Transform | undefined}
   */
  getTransform (): Transform | undefined {
    return this.world.getComponent<Transform>(this.id, COMPONENT_TRANSFORM)
  }

  /**
   * Attaches a component to this entity.
   *
   * @param {string} componentKey Component key.
   * @param {unknown} data Component data.
   * @returns {this}
   */
  attach (componentKey: string, data: unknown): this {
    this.world.setComponent(this.id, componentKey, data)
    return this
  }

  /**
   * Gets a typed component value.
   *
   * @template T
   * @param {string} componentKey Component key.
   * @returns {T | undefined}
   */
  get<T = unknown> (componentKey: string): T | undefined {
    return this.world.getComponent<T>(this.id, componentKey)
  }

  /**
   * Checks whether a component exists on this entity.
   *
   * @param {string} componentKey Component key.
   * @returns {boolean}
   */
  has (componentKey: string): boolean {
    return this.world.entities.get(this.id)?.components.has(componentKey) ?? false
  }

  /**
   * Removes a component from this entity.
   *
   * @param {string} componentKey Component key.
   * @returns {this}
   */
  remove (componentKey: string): this {
    this.world.removeComponent(this.id, componentKey)
    return this
  }

  /**
   * Destroys this entity.
   *
   * @returns {void} Nothing.
   */
  destroy (): void {
    this.world.destroyEntity(this.id)
  }

  /**
   * Creates/remounts Pixi view for this entity.
   *
   * @param {AssetRegistry} registry Loaded assets.
   * @param {Container} stage Stage container.
   * @returns {this}
   */
  mountPixiDisplay (registry: AssetRegistry, stage: Container): this {
    mountPixiDisplayForEntity(this.world, this.id, registry, stage)
    return this
  }
}
