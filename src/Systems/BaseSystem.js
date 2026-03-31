/**
 * Base class for tick systems. `enabled` is toggled from JSON `systems.<name>.enabled`.
 *
 * Subclasses may set `static inputRequirements` so GameManager auto-wires InputCoordinator.
 */
export class BaseSystem {
  /** @type {{ keyboard?: boolean, pointer?: boolean, wheel?: boolean, gamepad?: boolean }} */
  static inputRequirements = {};

  constructor() {
    /** @type {boolean} */
    this.enabled = true;
  }

  /**
   * @param {Record<string, unknown>} _options merged JSON block for this system
   */
  configure(_options) {}

  /**
   * @param {number} _dtSeconds
   * @param {import('../ECS/World.js').World} _world
   */
  update(_dtSeconds, _world) {}
}
