import type { World } from '../ECS/World.js'

export type InputRequirements = {
  keyboard?: boolean
  pointer?: boolean
  wheel?: boolean
  gamepad?: boolean
}

/**
 * Base class for runtime systems.
 */
export class BaseSystem {
  static inputRequirements: InputRequirements = {}
  enabled: boolean

  constructor () {
    this.enabled = true
  }

  /**
   * Applies system-specific options from config.
   *
   * @param {Record<string, unknown>} _options Raw options block.
   * @returns {void} Nothing.
   */
  configure (_options: Record<string, unknown>): void {}

  /**
   * Updates system logic for one frame.
   *
   * @param {number} _dtSeconds Delta time in seconds.
   * @param {World} _world ECS world.
   * @returns {void} Nothing.
   */
  update (_dtSeconds: number, _world: World): void {}
}
