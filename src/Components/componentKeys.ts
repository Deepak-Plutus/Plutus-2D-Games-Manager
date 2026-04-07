/**
 * ECS component bag keys (attach via BaseEntity / World).
 */
export const COMPONENT_TRANSFORM = 'transform'
export const COMPONENT_DISPLAY = 'display'
export const COMPONENT_BEHAVIORS = 'behaviors'
export const COMPONENT_META = 'meta'
/** Legacy / behaviors — same shape as COMPONENT_COLLIDER */
export const COMPONENT_COLLISION = 'collision'
export const COMPONENT_COLLIDER = 'collider'
export const COMPONENT_INSTANCE_VARIABLES = 'instanceVariables'
export const COMPONENT_LAYER = 'layer'

/** Sprite asset + display tuning (JSON `sprite` block also drives Pixi) */
export const COMPONENT_SPRITE = 'sprite'
/** Tiled / repeating sprite params */
export const COMPONENT_TILED_SPRITE = 'tiledSprite'
/** { x, y } linear velocity (px/s) */
export const COMPONENT_VELOCITY = 'velocity'
/** { x, y } acceleration (px/s²) */
export const COMPONENT_ACCELERATION = 'acceleration'
/** { value } scalar mass */
export const COMPONENT_MASS = 'mass'
/** Dynamics material + body kind */
export const COMPONENT_RIGID_BODY = 'rigidBody'
/** Playback / state holder for tweens or sprite animations */
export const COMPONENT_TWEEN_ANIMATION = 'tweenAnimation'

export const COMPONENT_HEALTH = 'health'
export const COMPONENT_DAMAGE = 'damage'
export const COMPONENT_ARMOR = 'armor'
export const COMPONENT_COLLECTIBLE = 'collectible'
export const COMPONENT_SCORE = 'score'

export const COMPONENT_AI_STATE = 'aiState'
export const COMPONENT_TARGET = 'target'
export const COMPONENT_PATROL_PATH = 'patrolPath'
export const COMPONENT_DETECTION_RADIUS = 'detectionRadius'

/** Per-entity input / action overrides (not global keyboard) */
export const COMPONENT_ENTITY_INPUT = 'entityInput'
export const COMPONENT_AUDIO_SOURCE = 'audioSource'
/** Countdown / cooldown slots on entity */
export const COMPONENT_ENTITY_TIMER = 'entityTimer'
/** String tags for queries (in addition to meta.tags) */
export const COMPONENT_TAGS = 'tags'
/** Auto-destroy after duration */
export const COMPONENT_LIFETIME = 'lifetime'

/** Named groups + optional GroupMembership.parentEntityId for Pixi hierarchy */
export const COMPONENT_GROUP = 'group'
/** Follow target + bounds; evaluated in BehaviorSystem */
export const COMPONENT_CAMERA = 'camera'

export type ComponentKey =
  | typeof COMPONENT_TRANSFORM
  | typeof COMPONENT_DISPLAY
  | typeof COMPONENT_BEHAVIORS
  | typeof COMPONENT_META
  | typeof COMPONENT_COLLISION
  | typeof COMPONENT_COLLIDER
  | typeof COMPONENT_INSTANCE_VARIABLES
  | typeof COMPONENT_LAYER
  | typeof COMPONENT_SPRITE
  | typeof COMPONENT_TILED_SPRITE
  | typeof COMPONENT_VELOCITY
  | typeof COMPONENT_ACCELERATION
  | typeof COMPONENT_MASS
  | typeof COMPONENT_RIGID_BODY
  | typeof COMPONENT_TWEEN_ANIMATION
  | typeof COMPONENT_HEALTH
  | typeof COMPONENT_DAMAGE
  | typeof COMPONENT_ARMOR
  | typeof COMPONENT_COLLECTIBLE
  | typeof COMPONENT_SCORE
  | typeof COMPONENT_AI_STATE
  | typeof COMPONENT_TARGET
  | typeof COMPONENT_PATROL_PATH
  | typeof COMPONENT_DETECTION_RADIUS
  | typeof COMPONENT_ENTITY_INPUT
  | typeof COMPONENT_AUDIO_SOURCE
  | typeof COMPONENT_ENTITY_TIMER
  | typeof COMPONENT_TAGS
  | typeof COMPONENT_LIFETIME
  | typeof COMPONENT_GROUP
  | typeof COMPONENT_CAMERA
