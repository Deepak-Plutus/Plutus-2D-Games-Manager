/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/turret */
export const turretBehaviorDefaults = {
  range: 400,
  /** Shots (On shoot triggers) per second */
  rateOfFire: 2,
  rotate: true,
  /** deg/s */
  rotateSpeed: 180,
  /** `first` | `nearest` */
  targetMode: 'first',
  predictiveAim: false,
  /** px/s — required for predictive aim */
  projectileSpeed: 400,
  useCollisionCells: true,
  /** Initial target meta.names (Add object to target) */
  targetNames: [],
  /** Degrees — within this aim error, On shoot can fire */
  aimToleranceDeg: 6,
};
