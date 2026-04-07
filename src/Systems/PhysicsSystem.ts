import Matter from 'matter-js'
import { BaseSystem } from './BaseSystem.js'
import type { World } from '../ECS/World.js'

const { Engine, Runner } = Matter

type Gravity = { x: number; y: number }
type PhysicsOptions = { gravity?: Partial<Gravity> }

export class PhysicsSystem extends BaseSystem {
  engine: Matter.Engine | null
  runner: Matter.Runner | null
  gravity: Gravity

  constructor () {
    super()
    this.engine = null
    this.runner = null
    this.gravity = { x: 0, y: 1 }
  }

  configure (options: Record<string, unknown>): void {
    const o = options as PhysicsOptions
    this.gravity = {
      x: Number(o.gravity?.x ?? this.gravity.x),
      y: Number(o.gravity?.y ?? this.gravity.y)
    }
  }

  update (_dt: number, _world: World): void {
    if (!this.enabled) return
  }

  start (): void {
    if (!this.enabled || this.engine) return
    this.engine = Engine.create({ gravity: this.gravity })
    this.runner = Runner.create()
    Runner.run(this.runner, this.engine)
  }

  stop (): void {
    if (this.runner) {
      Runner.stop(this.runner)
      this.runner = null
    }
    this.engine = null
  }
}
