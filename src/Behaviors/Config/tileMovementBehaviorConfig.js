/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/tile-movement */
export const tileMovementBehaviorDefaults = {
  gridSize: 32,
  /** seconds per tile edge */
  moveDuration: 0.15,
  isometric: false,
  /** 4 | 8 */
  directions: 4,
  defaultControls: false,
  keyBindings: {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
  },
};
