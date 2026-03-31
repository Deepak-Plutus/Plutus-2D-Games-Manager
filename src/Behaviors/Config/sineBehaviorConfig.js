/** @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/sine */
export const sineBehaviorDefaults = {
  /** horizontal | vertical | forwards | backwards | width | height | size | angle | opacity */
  movement: 'horizontal',
  /** sine | triangle | square | sawtooth | reverseSawtooth */
  wave: 'sine',
  /** seconds per full cycle */
  period: 4,
  magnitude: 50,
  /** Seconds offset along the cycle (0 = start) */
  periodOffset: 0,
  magnitudeRandom: 0,
  periodRandom: 0,
  randomizeInitialPhase: false,
};
