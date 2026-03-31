/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/pathfinding */
export const pathfindingBehaviorDefaults = {
  cellSize: 32,
  /** max layout cells derived from layout size */
  maxCellsWidth: 256,
  maxCellsHeight: 256,
  /** pixels/s along path */
  speed: 150,
  rotateToWaypoint: false,
  /** 4 | 8 neighbor connectivity */
  directions: 8,
  /** Stop this close to a cell center */
  waypointArriveDistance: 4,
  /** Regenerate grid from solids each findPath */
  obstaclesSolids: true,
};
