/** Patrol until line-of-sight to target, then chase. See {@link import('../PatrolChaseBehavior.js').PatrolChaseBehavior}. */
export const patrolChaseBehaviorDefaults = {
  targetName: '',
  enableChase: false,
  /** `ground` = X-only patrol + X-only chase (Y locked). `fly` = X-only patrol at spawn Y; chase uses full 2D. */
  mode: 'ground',
  patrolSpeed: 72,
  chaseSpeed: 125,
  losRange: 440,
  rayStep: 12,
  /** Degrees; 360 = omnidirectional */
  coneOfView: 360,
  patrolMinX: 0,
  patrolMaxX: 0,
  /** Fly mode: horizontal patrol amplitude (px). */
  ampX: 70,
  /** Reserved for future vertical fly patterns; current fly patrol is horizontal-only. */
  ampY: 45,
  patrolPeriod: 4.5,
  gravity: 1700,
  maxFallSpeed: 900,
};
