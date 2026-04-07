import type { Container } from 'pixi.js'
import type { Transform } from '../Components/Transform.js'
import type { World } from '../ECS/World.js'
import type { KeyboardInput } from '../Core/KeyboardInput.js'
import type { PointerInput } from '../Core/PointerInput.js'
import type { BehaviorEventHub } from '../Core/BehaviorEventHub.js'
import type { ColliderAabb } from '../Core/CollisionService.js'
import type { InputEventHub } from '../Core/InputEventHub.js'
import type { InputCoordinator } from '../Core/InputCoordinator.js'

/**
 * Per-frame runtime context passed to each behavior tick.
 *
 * Includes entity-local state (`transform`), world/services references, input,
 * collision snapshots, and optional rendering helpers.
 */
export type BehaviorRuntimeContext = {
  entityId: number
  transform: Transform
  world: World
  dt: number
  time: number
  input?: KeyboardInput | null
  pointer?: PointerInput | null
  layoutWidth: number
  layoutHeight: number
  displaySize?: { width: number; height: number }
  displayView?: Container | null
  stage?: Container | null
  events?: BehaviorEventHub | null
  colliders?: ColliderAabb[]
  scrollState?: {
    points: Array<{ x: number; y: number }>
    shake: { timeLeft: number; magnitude: number; reducing: boolean; totalDuration: number }
  }
  inputHub?: InputEventHub | null
  inputCoordinator?: InputCoordinator | null
}
