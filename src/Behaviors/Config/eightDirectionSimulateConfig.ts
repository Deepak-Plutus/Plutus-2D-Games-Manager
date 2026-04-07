/**
 * Direction-to-delta map for one-frame eight-direction simulated input.
 *
 * @type {Readonly<Record<string, { dx: number; dy: number }>>}
 */
export const EIGHT_DIRECTION_SIMULATE_DELTA = Object.freeze({
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 }
})
