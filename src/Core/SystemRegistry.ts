import type { World } from '../ECS/World.js'
import { BaseSystem, type InputRequirements } from '../Systems/BaseSystem.js'

type Entry = { name: string; system: BaseSystem }
type SystemsJson = Record<string, Record<string, unknown>>

export class SystemRegistry {
  private _entries: Entry[]

  constructor () {
    this._entries = []
  }

  register (name: string, system: BaseSystem): void {
    this._entries.push({ name, system })
  }

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

  startLifecycle (): void {
    for (const { system } of this._entries) {
      const withStart = system as BaseSystem & { start?: () => void }
      if (system.enabled && typeof withStart.start === 'function') withStart.start()
    }
  }

  update (dtSeconds: number, world: World): void {
    for (const { system } of this._entries) {
      if (system.enabled && typeof system.update === 'function') {
        system.update(dtSeconds, world)
      }
    }
  }

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
