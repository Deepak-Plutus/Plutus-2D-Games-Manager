import type { KeyboardInput } from '../Core/KeyboardInput.js'

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
