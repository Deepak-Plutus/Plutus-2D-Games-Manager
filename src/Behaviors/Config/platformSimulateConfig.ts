/**
 * Maps public platform simulation controls to internal one-frame flags.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const PLATFORM_SIMULATE_CONTROL_MAP = Object.freeze({
  left: '_simLeft',
  right: '_simRight',
  jump: '_simJump'
})
