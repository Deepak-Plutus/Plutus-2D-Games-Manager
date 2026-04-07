/**
 * Default settings for `PatrolChaseBehavior`.
 *
 * @type {const}
 */
export const patrolChaseBehaviorDefaults = {
  targetName: '',
  enableChase: false,
  mode: 'ground',
  patrolSpeed: 72,
  chaseSpeed: 125,
  losRange: 440,
  rayStep: 12,
  coneOfView: 360,
  patrolMinX: 0,
  patrolMaxX: 0,
  ampX: 70,
  ampY: 45,
  patrolPeriod: 4.5,
  gravity: 1700,
  maxFallSpeed: 900
}
