import type { KeyboardInput } from '../Core/KeyboardInput.js'

/**
 * Returns whether any key from a key-code list is currently pressed.
 *
 * @param {KeyboardInput | null | undefined} input Keyboard input service instance.
 * @param {string[] | undefined} codes Candidate key codes.
 * @returns {boolean} `true` if at least one code is down.
 */
export function isAnyKeyDown (
  input: KeyboardInput | null | undefined,
  codes: string[] | undefined
): boolean {
  if (!input || !codes?.length) return false
  for (const code of codes) {
    if (input.isDown(String(code))) return true
  }
  return false
}
