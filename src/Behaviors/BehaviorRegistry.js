import { BaseBehavior } from './BaseBehavior.js';

/**
 * Registers behavior classes and ticks Construct-style instances (sorted by priority).
 */
export class BehaviorRegistry {
  constructor() {
    /** @type {Map<string, typeof BaseBehavior>} */
    this._classes = new Map();
  }

  /**
   * @param {typeof BaseBehavior} BehaviorClass
   */
  registerClass(BehaviorClass) {
    const type = BehaviorClass.type;
    if (!type) return;
    this._classes.set(type, BehaviorClass);
  }

  /**
   * @param {unknown[]} arr raw JSON behavior entries from config
   * @returns {BaseBehavior[]}
   */
  createFromJsonArray(arr) {
    const out = [];
    if (!Array.isArray(arr)) return out;
    for (const raw of arr) {
      if (!raw || typeof raw !== 'object') continue;
      const type = String(/** @type {Record<string, unknown>} */ (raw).type ?? '');
      const Cls = this._classes.get(type);
      if (Cls) {
        out.push(new Cls(/** @type {Record<string, unknown>} */ (raw)));
      }
    }
    return out;
  }

  /**
   * @param {number} entityId
   * @param {import('../Components/Transform.js').Transform} transform
   * @param {BaseBehavior[]} instances
   * @param {number} dt
   * @param {import('../ECS/World.js').World} world
   * @param {{ time?: number, input?: import('../Core/KeyboardInput.js').KeyboardInput | null, inputHub?: import('../Core/InputEventHub.js').InputEventHub | null, inputCoordinator?: import('../Core/InputCoordinator.js').InputCoordinator | null, layoutWidth: number, layoutHeight: number, displaySize?: { width: number, height: number } }} runtime
   */
  tick(entityId, transform, instances, dt, world, runtime) {
    if (!Array.isArray(instances) || instances.length === 0) return;

    const sorted = instances
      .map((b, i) => ({ b, i }))
      .sort((A, B) => {
        const pa = /** @type {typeof BaseBehavior} */ (A.b.constructor).priority ?? 50;
        const pb = /** @type {typeof BaseBehavior} */ (B.b.constructor).priority ?? 50;
        if (pa !== pb) return pa - pb;
        return A.i - B.i;
      })
      .map((x) => x.b);

    const ctx = {
      entityId,
      transform,
      world,
      dt,
      ...runtime,
    };

    for (const behavior of sorted) {
      if (behavior.isEnabled()) behavior.tick(ctx);
    }
  }
}
