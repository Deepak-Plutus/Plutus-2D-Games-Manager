/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/line-of-sight */
export const lineOfSightBehaviorDefaults = {
  targetName: '',
  range: 500,
  rayStep: 8,
  /** Degrees; 360 = no cone limit. Uses follower transform.rotation as forward */
  coneOfView: 360,
  /**
   * `solids` — block on colliders with kind `solid`.
   * `custom` — only colliders whose entity `meta.name` is in customObstacleNames.
   */
  obstacles: 'solids',
  /** Used when obstacles === `custom` */
  customObstacleNames: [],
};
