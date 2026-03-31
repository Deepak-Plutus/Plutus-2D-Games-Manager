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
  GroupMembership,
  DetectionRadius,
  EntityInput,
  EntityTimer,
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
  Velocity,
} from '../Components/index.js';

/**
 * Attaches optional gameplay components from merged entity JSON (beyond core transform/meta/display).
 * @param {import('../ECS/World.js').World} world
 * @param {number} entityId
 * @param {Record<string, unknown>} merged
 */
export function attachGameComponents(world, entityId, merged) {
  if (merged.sprite && typeof merged.sprite === 'object' && !Array.isArray(merged.sprite)) {
    const sd = /** @type {Record<string, unknown>} */ (merged.sprite);
    const shape = sd.shape != null ? String(sd.shape).toLowerCase() : '';
    if (sd.assetId != null || shape === 'circle' || shape === 'rect') {
      world.setComponent(entityId, COMPONENT_SPRITE, SpriteData.fromJson(sd));
    }
  }
  if (merged.tiledSprite && typeof merged.tiledSprite === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_TILED_SPRITE,
      TiledSpriteData.fromJson(/** @type {Record<string, unknown>} */ (merged.tiledSprite)),
    );
  }
  if (merged.velocity && typeof merged.velocity === 'object') {
    world.setComponent(entityId, COMPONENT_VELOCITY, Velocity.fromJson(/** @type {Record<string, unknown>} */ (merged.velocity)));
  }
  if (merged.acceleration && typeof merged.acceleration === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_ACCELERATION,
      Acceleration.fromJson(/** @type {Record<string, unknown>} */ (merged.acceleration)),
    );
  }
  if (merged.mass != null) {
    if (typeof merged.mass === 'object' && !Array.isArray(merged.mass)) {
      world.setComponent(entityId, COMPONENT_MASS, Mass.fromJson(/** @type {Record<string, unknown>} */ (merged.mass)));
    } else {
      world.setComponent(entityId, COMPONENT_MASS, new Mass(merged.mass));
    }
  }
  if (merged.rigidBody && typeof merged.rigidBody === 'object') {
    world.setComponent(entityId, COMPONENT_RIGID_BODY, RigidBody.fromJson(/** @type {Record<string, unknown>} */ (merged.rigidBody)));
  }
  if (merged.collider && typeof merged.collider === 'object') {
    const c = Collider.fromJson(/** @type {Record<string, unknown>} */ (merged.collider));
    world.setComponent(entityId, COMPONENT_COLLIDER, c);
    world.setComponent(entityId, COMPONENT_COLLISION, c.toCollisionShape());
  }
  if (merged.tweenAnimation && typeof merged.tweenAnimation === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_TWEEN_ANIMATION,
      TweenAnimation.fromJson(/** @type {Record<string, unknown>} */ (merged.tweenAnimation)),
    );
  }
  if (merged.health && typeof merged.health === 'object') {
    world.setComponent(entityId, COMPONENT_HEALTH, Health.fromJson(/** @type {Record<string, unknown>} */ (merged.health)));
  }
  if (merged.damage && typeof merged.damage === 'object') {
    world.setComponent(entityId, COMPONENT_DAMAGE, Damage.fromJson(/** @type {Record<string, unknown>} */ (merged.damage)));
  }
  if (merged.armor && typeof merged.armor === 'object') {
    world.setComponent(entityId, COMPONENT_ARMOR, Armor.fromJson(/** @type {Record<string, unknown>} */ (merged.armor)));
  }
  if (merged.collectible && typeof merged.collectible === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_COLLECTIBLE,
      Collectible.fromJson(/** @type {Record<string, unknown>} */ (merged.collectible)),
    );
  }
  if (merged.score && typeof merged.score === 'object') {
    world.setComponent(entityId, COMPONENT_SCORE, Score.fromJson(/** @type {Record<string, unknown>} */ (merged.score)));
  }
  if (merged.aiState && typeof merged.aiState === 'object') {
    world.setComponent(entityId, COMPONENT_AI_STATE, AIState.fromJson(/** @type {Record<string, unknown>} */ (merged.aiState)));
  }
  if (merged.target && typeof merged.target === 'object') {
    world.setComponent(entityId, COMPONENT_TARGET, Target.fromJson(/** @type {Record<string, unknown>} */ (merged.target)));
  }
  if (merged.patrolPath && typeof merged.patrolPath === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_PATROL_PATH,
      PatrolPath.fromJson(/** @type {Record<string, unknown>} */ (merged.patrolPath)),
    );
  }
  if (merged.detectionRadius && typeof merged.detectionRadius === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_DETECTION_RADIUS,
      DetectionRadius.fromJson(/** @type {Record<string, unknown>} */ (merged.detectionRadius)),
    );
  }
  if (merged.entityInput && typeof merged.entityInput === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_ENTITY_INPUT,
      EntityInput.fromJson(/** @type {Record<string, unknown>} */ (merged.entityInput)),
    );
  }
  if (merged.audioSource && typeof merged.audioSource === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_AUDIO_SOURCE,
      AudioSource.fromJson(/** @type {Record<string, unknown>} */ (merged.audioSource)),
    );
  }
  if (merged.entityTimer && typeof merged.entityTimer === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_ENTITY_TIMER,
      EntityTimer.fromJson(/** @type {Record<string, unknown>} */ (merged.entityTimer)),
    );
  }
  if (merged.tags && typeof merged.tags === 'object') {
    world.setComponent(entityId, COMPONENT_TAGS, Tags.fromJson(/** @type {Record<string, unknown>} */ (merged.tags)));
  }
  if (merged.lifetime && typeof merged.lifetime === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_LIFETIME,
      Lifetime.fromJson(/** @type {Record<string, unknown>} */ (merged.lifetime)),
    );
  }
  if (merged.group && typeof merged.group === 'object') {
    world.setComponent(
      entityId,
      COMPONENT_GROUP,
      GroupMembership.fromJson(/** @type {Record<string, unknown>} */ (merged.group)),
    );
  } else if (Array.isArray(merged.groups)) {
    world.setComponent(
      entityId,
      COMPONENT_GROUP,
      new GroupMembership({ groupIds: /** @type {unknown[]} */ (merged.groups) }),
    );
  }
  if (merged.camera && typeof merged.camera === 'object') {
    world.setComponent(entityId, COMPONENT_CAMERA, Camera.fromJson(/** @type {Record<string, unknown>} */ (merged.camera)));
  }
}
