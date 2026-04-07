/**
 * Public barrel exports for all ECS component builders, models, and keys.
 */
export { buildMetaRecord } from './Meta.js'
export { InstanceVariables } from './InstanceVariables.js'
export { Layer } from './Layer.js'
export { Transform } from './Transform.js'

export * from './componentKeys.js'
export { SpriteData, TiledSpriteData } from './RenderingComponents.js'
export { Velocity, Acceleration, Mass, RigidBody, Collider } from './PhysicsComponents.js'
export { Health, Damage, Armor, Collectible, Score } from './CombatComponents.js'
export {
  AIState,
  Target,
  PatrolPath,
  DetectionRadius,
  EntityInput,
  AudioSource,
  EntityTimer,
  Tags,
  Lifetime,
  TweenAnimation
} from './LogicComponents.js'
export { GroupMembership, Camera } from './SceneComponents.js'
