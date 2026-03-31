/**
 * Construct 3 `simulateControl` uses logical control names (not keyboard codes).
 * Maps normalized control string → instance flag property name.
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/platform
 */
export const PLATFORM_SIMULATE_CONTROL_MAP = Object.freeze({
  left: '_simLeft',
  right: '_simRight',
  jump: '_simJump',
});
