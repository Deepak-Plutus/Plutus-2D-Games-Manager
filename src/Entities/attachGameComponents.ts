import {
  AIState,
  Acceleration,
  Armor,
  AudioSource,
  Camera,
  Collectible,
  Collider,
  COMPONENT_ACCELERATION,
  COMPONENT_AI_STATE,
  COMPONENT_ARMOR,
  COMPONENT_AUDIO_SOURCE,
  COMPONENT_CAMERA,
  COMPONENT_COLLECTIBLE,
  COMPONENT_COLLIDER,
  COMPONENT_COLLISION,
  COMPONENT_DAMAGE,
  COMPONENT_DETECTION_RADIUS,
  COMPONENT_ENTITY_INPUT,
  COMPONENT_ENTITY_TIMER,
  COMPONENT_GROUP,
  COMPONENT_HEALTH,
  COMPONENT_LIFETIME,
  COMPONENT_MASS,
  COMPONENT_PATROL_PATH,
  COMPONENT_RIGID_BODY,
  COMPONENT_SCORE,
  COMPONENT_SPRITE,
  COMPONENT_TAGS,
  COMPONENT_TARGET,
  COMPONENT_TILED_SPRITE,
  COMPONENT_TWEEN_ANIMATION,
  COMPONENT_VELOCITY,
  Damage,
  DetectionRadius,
  EntityInput,
  EntityTimer,
  GroupMembership,
  Health,
  Lifetime,
  Mass,
  PatrolPath,
  RigidBody,
  Score,
  SpriteData,
  Tags,
  Target,
  TiledSpriteData,
  TweenAnimation,
  Velocity
} from '../Components/index.js'
import type { World } from '../ECS/World.js'

type JsonRecord = Record<string, unknown>

export function attachGameComponents (world: World, entityId: number, merged: JsonRecord): void {
  if (merged.sprite && typeof merged.sprite === 'object' && !Array.isArray(merged.sprite)) {
    const sd = merged.sprite as JsonRecord
    const shape = sd.shape != null ? String(sd.shape).toLowerCase() : ''
    if (sd.assetId != null || shape === 'circle' || shape === 'rect') {
      world.setComponent(entityId, COMPONENT_SPRITE, SpriteData.fromJson(sd))
    }
  }
  if (merged.tiledSprite && typeof merged.tiledSprite === 'object') {
    world.setComponent(entityId, COMPONENT_TILED_SPRITE, TiledSpriteData.fromJson(merged.tiledSprite as JsonRecord))
  }
  if (merged.velocity && typeof merged.velocity === 'object') {
    world.setComponent(entityId, COMPONENT_VELOCITY, Velocity.fromJson(merged.velocity as JsonRecord))
  }
  if (merged.acceleration && typeof merged.acceleration === 'object') {
    world.setComponent(entityId, COMPONENT_ACCELERATION, Acceleration.fromJson(merged.acceleration as JsonRecord))
  }
  if (merged.mass != null) {
    if (typeof merged.mass === 'object' && !Array.isArray(merged.mass)) {
      world.setComponent(entityId, COMPONENT_MASS, Mass.fromJson(merged.mass as JsonRecord))
    } else {
      world.setComponent(entityId, COMPONENT_MASS, new Mass(merged.mass))
    }
  }
  if (merged.rigidBody && typeof merged.rigidBody === 'object') {
    world.setComponent(entityId, COMPONENT_RIGID_BODY, RigidBody.fromJson(merged.rigidBody as JsonRecord))
  }
  if (merged.collider && typeof merged.collider === 'object') {
    const c = Collider.fromJson(merged.collider as JsonRecord)
    world.setComponent(entityId, COMPONENT_COLLIDER, c)
    world.setComponent(entityId, COMPONENT_COLLISION, c.toCollisionShape())
  }
  if (merged.tweenAnimation && typeof merged.tweenAnimation === 'object') {
    world.setComponent(entityId, COMPONENT_TWEEN_ANIMATION, TweenAnimation.fromJson(merged.tweenAnimation as JsonRecord))
  }
  if (merged.health && typeof merged.health === 'object') {
    world.setComponent(entityId, COMPONENT_HEALTH, Health.fromJson(merged.health as JsonRecord))
  }
  if (merged.damage && typeof merged.damage === 'object') {
    world.setComponent(entityId, COMPONENT_DAMAGE, Damage.fromJson(merged.damage as JsonRecord))
  }
  if (merged.armor && typeof merged.armor === 'object') {
    world.setComponent(entityId, COMPONENT_ARMOR, Armor.fromJson(merged.armor as JsonRecord))
  }
  if (merged.collectible && typeof merged.collectible === 'object') {
    world.setComponent(entityId, COMPONENT_COLLECTIBLE, Collectible.fromJson(merged.collectible as JsonRecord))
  }
  if (merged.score && typeof merged.score === 'object') {
    world.setComponent(entityId, COMPONENT_SCORE, Score.fromJson(merged.score as JsonRecord))
  }
  if (merged.aiState && typeof merged.aiState === 'object') {
    world.setComponent(entityId, COMPONENT_AI_STATE, AIState.fromJson(merged.aiState as JsonRecord))
  }
  if (merged.target && typeof merged.target === 'object') {
    world.setComponent(entityId, COMPONENT_TARGET, Target.fromJson(merged.target as JsonRecord))
  }
  if (merged.patrolPath && typeof merged.patrolPath === 'object') {
    world.setComponent(entityId, COMPONENT_PATROL_PATH, PatrolPath.fromJson(merged.patrolPath as JsonRecord))
  }
  if (merged.detectionRadius && typeof merged.detectionRadius === 'object') {
    world.setComponent(entityId, COMPONENT_DETECTION_RADIUS, DetectionRadius.fromJson(merged.detectionRadius as JsonRecord))
  }
  if (merged.entityInput && typeof merged.entityInput === 'object') {
    world.setComponent(entityId, COMPONENT_ENTITY_INPUT, EntityInput.fromJson(merged.entityInput as JsonRecord))
  }
  if (merged.audioSource && typeof merged.audioSource === 'object') {
    world.setComponent(entityId, COMPONENT_AUDIO_SOURCE, AudioSource.fromJson(merged.audioSource as JsonRecord))
  }
  if (merged.entityTimer && typeof merged.entityTimer === 'object') {
    world.setComponent(entityId, COMPONENT_ENTITY_TIMER, EntityTimer.fromJson(merged.entityTimer as JsonRecord))
  }
  if (merged.tags && typeof merged.tags === 'object') {
    world.setComponent(entityId, COMPONENT_TAGS, Tags.fromJson(merged.tags as JsonRecord))
  }
  if (merged.lifetime && typeof merged.lifetime === 'object') {
    world.setComponent(entityId, COMPONENT_LIFETIME, Lifetime.fromJson(merged.lifetime as JsonRecord))
  }
  if (merged.group && typeof merged.group === 'object') {
    world.setComponent(entityId, COMPONENT_GROUP, GroupMembership.fromJson(merged.group as JsonRecord))
  } else if (Array.isArray(merged.groups)) {
    world.setComponent(entityId, COMPONENT_GROUP, new GroupMembership({ groupIds: merged.groups as unknown[] }))
  }
  if (merged.camera && typeof merged.camera === 'object') {
    world.setComponent(entityId, COMPONENT_CAMERA, Camera.fromJson(merged.camera as JsonRecord))
  }
}
