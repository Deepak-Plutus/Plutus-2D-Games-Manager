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

/**
 * Registry and executor for behavior classes.
 *
 * Handles:
 * - behavior class registration by static `type`
 * - behavior instance creation from JSON arrays
 * - deterministic per-entity ticking by behavior priority
 *
 * @example
 * const registry = new BehaviorRegistry()
 * registry.registerClass(CarBehavior)
 * const behaviors = registry.createFromJsonArray([{ type: 'car', maxSpeed: 300 }])
 */
export class BehaviorRegistry {
  private _classes: Map<string, typeof BaseBehavior>

  constructor () {
    this._classes = new Map()
  }

  /**
   * Registers a behavior class using its static `type` key.
   *
   * @param {typeof BaseBehavior} BehaviorClass Behavior constructor to register.
   * @returns {void} Nothing.
   */
  registerClass (BehaviorClass: typeof BaseBehavior): void {
    const type = BehaviorClass.type
    if (!type) return
    this._classes.set(type, BehaviorClass)
  }

  /**
   * Instantiates behavior instances from raw JSON definitions.
   *
   * Unknown `type` entries are ignored.
   *
   * @param {unknown[]} arr Raw behavior config array from entity/objectType JSON.
   * @returns {BaseBehavior[]} Instantiated behavior list.
   */
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

  /**
   * Ticks all enabled behaviors for one entity using deterministic ordering.
   *
   * Behaviors are sorted by static `priority` (ascending), then by original
   * declaration order to keep ties stable.
   *
   * @param {number} entityId Runtime entity id.
   * @param {Transform} transform Entity transform component.
   * @param {BaseBehavior[]} instances Behavior instances attached to this entity.
   * @param {number} dt Delta time in seconds.
   * @param {World} world ECS world reference.
   * @param {RuntimeShape} runtime Shared runtime/frame services and layout values.
   * @returns {void} Nothing.
   */
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
