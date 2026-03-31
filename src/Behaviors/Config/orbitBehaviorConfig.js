/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/orbit */
export const orbitBehaviorDefaults = {
  /** deg/s, + = clockwise */
  speed: 45,
  /** deg/s² */
  acceleration: 0,
  primaryRadius: 100,
  secondaryRadius: 100,
  /** deg — ellipse rotation / initial phase for circles */
  offsetAngle: 0,
  matchRotation: true,
  /** Optional fixed center; if unset, first tick uses current position */
  centerX: null,
  centerY: null,
  /** Orbit another object by meta.name (Pin / Unpin) */
  pinnedTargetName: '',
};
