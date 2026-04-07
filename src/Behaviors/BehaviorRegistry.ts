import type { Transform } from '../Components/Transform.js'
import type { World } from '../ECS/World.js'
import type { InputCoordinator } from '../Core/InputCoordinator.js'
import type { InputEventHub } from '../Core/InputEventHub.js'
import type { KeyboardInput } from '../Core/KeyboardInput.js'
import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

type RuntimeShape = {
  time?: number
  input?: KeyboardInput | null
  inputHub?: InputEventHub | null
  inputCoordinator?: InputCoordinator | null
  layoutWidth: number
  layoutHeight: number
  displaySize?: { width: number; height: number }
}

export class BehaviorRegistry {
  private _classes: Map<string, typeof BaseBehavior>

  constructor () {
    this._classes = new Map()
  }

  registerClass (BehaviorClass: typeof BaseBehavior): void {
    const type = BehaviorClass.type
    if (!type) return
    this._classes.set(type, BehaviorClass)
  }

  createFromJsonArray (arr: unknown[]): BaseBehavior[] {
    const out: BaseBehavior[] = []
    if (!Array.isArray(arr)) return out
    for (const raw of arr) {
      if (!raw || typeof raw !== 'object') continue
      const rec = raw as Record<string, unknown>
      const type = String(rec.type ?? '')
      const Cls = this._classes.get(type)
      if (Cls) out.push(new Cls(rec))
    }
    return out
  }

  tick (
    entityId: number,
    transform: Transform,
    instances: BaseBehavior[],
    dt: number,
    world: World,
    runtime: RuntimeShape
  ): void {
    if (!Array.isArray(instances) || instances.length === 0) return
    const sorted = instances
      .map((b, i) => ({ b, i }))
      .sort((a, b) => {
        const pa = (a.b.constructor as typeof BaseBehavior).priority ?? 50
        const pb = (b.b.constructor as typeof BaseBehavior).priority ?? 50
        if (pa !== pb) return pa - pb
        return a.i - b.i
      })
      .map(x => x.b)

    const ctx: BehaviorRuntimeContext = {
      entityId,
      transform,
      world,
      dt,
      time: runtime.time ?? 0,
      ...runtime
    }

    for (const behavior of sorted) {
      if (behavior.isEnabled()) behavior.tick(ctx)
    }
  }
}
