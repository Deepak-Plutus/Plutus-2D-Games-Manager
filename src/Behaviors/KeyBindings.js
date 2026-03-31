/**
 * @param {import('../Core/KeyboardInput.js').KeyboardInput | null | undefined} input
 * @param {string[] | undefined} codes `KeyboardEvent.code` values (e.g. ArrowLeft, KeyA, Space)
 */
export function isAnyKeyDown(input, codes) {
  if (!input || !codes?.length) return false;
  for (const code of codes) {
    if (input.isDown(String(code))) return true;
  }
  return false;
}
