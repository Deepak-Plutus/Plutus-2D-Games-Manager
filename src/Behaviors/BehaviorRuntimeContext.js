/**
 * @typedef {object} BehaviorRuntimeContext
 * @property {number} entityId
 * @property {import('../Components/Transform.js').Transform} transform
 * @property {import('../ECS/World.js').World} world
 * @property {number} dt
 * @property {number} time Game time in seconds (monotonic, from {@link import('../Systems/BehaviorSystem.js').BehaviorSystem})
 * @property {import('../Core/KeyboardInput.js').KeyboardInput | null} [input]
 * @property {import('../Core/PointerInput.js').PointerInput | null} [pointer]
 * @property {number} layoutWidth
 * @property {number} layoutHeight
 * @property {{ width: number, height: number }} [displaySize]
 * @property {import('pixi.js').Container | null} [displayView]
 * @property {import('pixi.js').Container | null} [stage]
 * @property {import('../Core/BehaviorEventHub.js').BehaviorEventHub | null} [events]
 * @property {import('../Core/CollisionService.js').ColliderAabb[]} [colliders]
 * @property {{ points: { x: number, y: number }[], shake: { timeLeft: number, magnitude: number, reducing: boolean, totalDuration: number } } | undefined} [scrollState]
 * @property {import('../Core/InputEventHub.js').InputEventHub | null} [inputHub] device input events (`keyboard:*`, `pointer:*`, `drag:*`, `wheel`, …)
 * @property {import('../Core/InputCoordinator.js').InputCoordinator | null} [inputCoordinator] action map + `isActionDown` + virtual joystick
 */

export {};
