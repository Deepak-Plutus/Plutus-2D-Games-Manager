import type { World } from '../ECS/World.js'
import { BaseSystem, type InputRequirements } from '../Systems/BaseSystem.js'

type Entry = { name: string; system: BaseSystem }
type SystemsJson = Record<string, Record<string, unknown>>

/**
 * Registry for runtime systems and lifecycle/config orchestration.
 */
export class SystemRegistry {
  private _entries: Entry[]

  constructor () {
    this._entries = []
  }

  /**
   * Registers a named system instance.
   *
   * @param {string} name System config key.
   * @param {BaseSystem} system System instance.
   * @returns {void} Nothing.
   */
  register (name: string, system: BaseSystem): void {
    this._entries.push({ name, system })
  }

  /**
   * Applies `systems` config blocks to registered systems.
   *
   * @param {SystemsJson} systemsJson Top-level systems config object.
   * @returns {void} Nothing.
   */
  applyConfig (systemsJson: SystemsJson = {}): void {
    for (const { name, system } of this._entries) {
      const block = systemsJson[name] ?? {}
      const enabled = block.enabled !== false
      system.enabled = enabled
      if (typeof system.configure === 'function') {
        system.configure(block)
      }
    }
  }

  /**
   * Calls optional start hooks for enabled systems.
   *
   * @returns {void} Nothing.
   */
  startLifecycle (): void {
    for (const { system } of this._entries) {
      const withStart = system as BaseSystem & { start?: () => void }
      if (system.enabled && typeof withStart.start === 'function') withStart.start()
    }
  }

  /**
   * Updates enabled systems in registration order.
   *
   * @param {number} dtSeconds Delta time in seconds.
   * @param {World} world ECS world.
   * @returns {void} Nothing.
   */
  update (dtSeconds: number, world: World): void {
    for (const { system } of this._entries) {
      if (system.enabled && typeof system.update === 'function') {
        system.update(dtSeconds, world)
      }
    }
  }

  /**
   * Computes union of input requirements across systems.
   *
   * @param {boolean} onlyEnabled If true, only enabled systems are considered.
   * @returns {Required<InputRequirements>}
   */
  getMergedInputRequirements (onlyEnabled = false): Required<InputRequirements> {
    const m: Required<InputRequirements> = {
      keyboard: false,
      pointer: false,
      wheel: false,
      gamepad: false
    }
    for (const { system } of this._entries) {
      if (onlyEnabled && system.enabled === false) continue
      const C = system.constructor as typeof BaseSystem & {
        inputRequirements?: InputRequirements
      }
      const r = C.inputRequirements
      if (!r) continue
      if (r.keyboard) m.keyboard = true
      if (r.pointer) m.pointer = true
      if (r.wheel) m.wheel = true
      if (r.gamepad) m.gamepad = true
    }
    return m
  }
}
