/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/car */
export const carBehaviorDefaults = {
  maxSpeed: 350,
  acceleration: 1200,
  deceleration: 1400,
  /** deg/s at full steer */
  steerSpeed: 120,
  defaultControls: true,
  driftFactor: 0,
  keyBindings: {
    accelerate: ['ArrowUp'],
    brake: ['ArrowDown'],
    steerLeft: ['ArrowLeft'],
    steerRight: ['ArrowRight'],
  },
};
