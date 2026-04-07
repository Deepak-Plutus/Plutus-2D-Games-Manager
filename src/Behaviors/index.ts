import { BehaviorRegistry } from './BehaviorRegistry.js'
import { BoundToLayoutBehavior } from './BoundToLayoutBehavior.js'
import { BulletBehavior } from './BulletBehavior.js'
import { CarBehavior } from './CarBehavior.js'
import { DestroyOutsideLayoutBehavior } from './DestroyOutsideLayoutBehavior.js'
import { DragDropBehavior } from './DragDropBehavior.js'
import { EightDirectionBehavior } from './EightDirectionBehavior.js'
import { FadeBehavior } from './FadeBehavior.js'
import { FlashBehavior } from './FlashBehavior.js'
import { FollowBehavior } from './FollowBehavior.js'
import { JumpThruBehavior } from './JumpThruBehavior.js'
import { LineOfSightBehavior } from './LineOfSightBehavior.js'
import { MoveToBehavior } from './MoveToBehavior.js'
import { OrbitBehavior } from './OrbitBehavior.js'
import { PathfindingBehavior } from './PathfindingBehavior.js'
import { PatrolChaseBehavior } from './PatrolChaseBehavior.js'
import { PersistBehavior } from './PersistBehavior.js'
import { PhysicsBehavior } from './PhysicsBehavior.js'
import { PinBehavior } from './PinBehavior.js'
import { PlatformBehavior } from './PlatformBehavior.js'
import { RotateBehavior } from './RotateBehavior.js'
import { ScrollToBehavior } from './ScrollToBehavior.js'
import { SineBehavior } from './SineBehavior.js'
import { SolidBehavior } from './SolidBehavior.js'
import { TileMovementBehavior } from './TileMovementBehavior.js'
import { TimerBehavior } from './TimerBehavior.js'
import { TurretBehavior } from './TurretBehavior.js'
import { TweenBehavior } from './TweenBehavior.js'
import { WrapBehavior } from './WrapBehavior.js'

/**
 * Central behavior bootstrapper for registering all built-in behaviors.
 */
export class BehaviorBootstrap {
  /**
   * Registers every shipped behavior class into the provided registry.
   *
   * @param {BehaviorRegistry} registry Behavior registry to populate.
   * @returns {void} Nothing.
   */
  static registerAll (registry: BehaviorRegistry): void {
    registry.registerClass(SolidBehavior)
    registry.registerClass(JumpThruBehavior)
    registry.registerClass(RotateBehavior)
    registry.registerClass(MoveToBehavior)
    registry.registerClass(BulletBehavior)
    registry.registerClass(PlatformBehavior)
    registry.registerClass(EightDirectionBehavior)
    registry.registerClass(FollowBehavior)
    registry.registerClass(DragDropBehavior)
    registry.registerClass(BoundToLayoutBehavior)
    registry.registerClass(FadeBehavior)
    registry.registerClass(FlashBehavior)
    registry.registerClass(DestroyOutsideLayoutBehavior)
    registry.registerClass(LineOfSightBehavior)
    registry.registerClass(OrbitBehavior)
    registry.registerClass(PathfindingBehavior)
    registry.registerClass(PatrolChaseBehavior)
    registry.registerClass(PersistBehavior)
    registry.registerClass(PhysicsBehavior)
    registry.registerClass(PinBehavior)
    registry.registerClass(CarBehavior)
    registry.registerClass(ScrollToBehavior)
    registry.registerClass(TileMovementBehavior)
    registry.registerClass(SineBehavior)
    registry.registerClass(TweenBehavior)
    registry.registerClass(TurretBehavior)
    registry.registerClass(TimerBehavior)
    registry.registerClass(WrapBehavior)
  }
}
