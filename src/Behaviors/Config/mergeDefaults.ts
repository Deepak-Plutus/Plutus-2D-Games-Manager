/**
 * Deep-merges behavior JSON on top of default values.
 *
 * Skips `type` and `undefined` keys while preserving nested object structure.
 *
 * @param {Record<string, unknown>} base Default config object.
 * @param {Record<string, unknown> | undefined} json User-provided behavior config.
 * @returns {Record<string, unknown>} Merged behavior config.
 */
export function mergeBehaviorDefaults (
  base: Record<string, unknown>,
  json?: Record<string, unknown>
): Record<string, unknown> {
  const out = structuredClone(base)
  if (!json || typeof json !== 'object') return out
  for (const [k, v] of Object.entries(json)) {
    if (k === 'type') continue
    if (v === undefined) continue
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof out[k] === 'object' &&
      out[k] !== null &&
      !Array.isArray(out[k])
    ) {
      out[k] = mergeBehaviorDefaults(out[k] as Record<string, unknown>, v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out
}
