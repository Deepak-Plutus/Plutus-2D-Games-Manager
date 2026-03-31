/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/move */
export const moveToBehaviorDefaults = {
  targetX: 0,
  targetY: 0,
  maxSpeed: 200,
  acceleration: 800,
  /** Stop within this distance */
  arriveDistance: 2,
  rotateToward: false,
  /** Auto-start moving to targetX/Y on spawn */
  autoStart: true,
};
