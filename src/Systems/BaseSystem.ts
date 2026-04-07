import type { World } from '../ECS/World.js'

export type InputRequirements = {
  keyboard?: boolean
  pointer?: boolean
  wheel?: boolean
  gamepad?: boolean
}

export class BaseSystem {
  static inputRequirements: InputRequirements = {}
  enabled: boolean

  constructor () {
    this.enabled = true
  }

  configure (_options: Record<string, unknown>): void {}

  update (_dtSeconds: number, _world: World): void {}
}
