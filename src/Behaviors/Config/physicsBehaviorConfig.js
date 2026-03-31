/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/physics */
export const physicsBehaviorDefaults = {
  /** px/s initial (internal) */
  velocityX: 0,
  velocityY: 0,
  /** rad/s */
  angularVelocity: 0,
  gravity: 0,
  /** 0..1 linear damping per second factor approx */
  linearDamping: 0,
  /** 0..1 angular damping */
  angularDamping: 0,
  /** Elasticity 0..1 on solid overlap resolution */
  elasticity: 0.2,
  friction: 0.1,
  maxSpeed: 800,
  /** Integrate rotation from angularVelocity */
  applyAngularVelocity: true,
};
