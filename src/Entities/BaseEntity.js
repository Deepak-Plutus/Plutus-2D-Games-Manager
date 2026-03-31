import { mountPixiDisplayForEntity } from '../Core/PixiEntityDisplay.js';
import { COMPONENT_TRANSFORM } from '../Components/index.js';

/**
 * Thin handle for one ECS entity: attach typed data bags for rendering, logic, and UI-facing state.
 *
 * @example
 * import { COMPONENT_VELOCITY, Velocity } from '../Components/index.js';
 * BaseEntity.wrap(world, id).attach(COMPONENT_VELOCITY, new Velocity(10, 0));
 */
export class BaseEntity {
  /**
   * @param {import('../ECS/World.js').World} world
   * @param {number} entityId
   */
  constructor(world, entityId) {
    this.world = world;
    this.id = entityId;
  }

  /**
   * @param {import('../ECS/World.js').World} world
   * @param {number} entityId
   * @returns {BaseEntity}
   */
  static wrap(world, entityId) {
    return new BaseEntity(world, entityId);
  }

  /** @returns {import('../Components/Transform.js').Transform | undefined} */
  getTransform() {
    return /** @type {import('../Components/Transform.js').Transform | undefined} */ (
      this.world.getComponent(this.id, COMPONENT_TRANSFORM)
    );
  }

  /**
   * @param {string} componentKey
   * @param {unknown} data
   * @returns {this}
   */
  attach(componentKey, data) {
    this.world.setComponent(this.id, componentKey, data);
    return this;
  }

  /**
   * @param {string} componentKey
   * @returns {unknown}
   */
  get(componentKey) {
    return this.world.getComponent(this.id, componentKey);
  }

  /**
   * @param {string} componentKey
   */
  has(componentKey) {
    return this.world.entities.get(this.id)?.components.has(componentKey) ?? false;
  }

  /**
   * @param {string} componentKey
   * @returns {this}
   */
  remove(componentKey) {
    this.world.removeComponent(this.id, componentKey);
    return this;
  }

  destroy() {
    this.world.destroyEntity(this.id);
  }

  /**
   * Rebuilds Pixi `display` from `sprite` / `tiledSprite` ECS components (call after attaching or changing them).
   * @param {import('../Core/AssetRegistry.js').AssetRegistry} registry
   * @param {import('pixi.js').Container} stage
   * @returns {this}
   */
  mountPixiDisplay(registry, stage) {
    mountPixiDisplayForEntity(this.world, this.id, registry, stage);
    return this;
  }
}
