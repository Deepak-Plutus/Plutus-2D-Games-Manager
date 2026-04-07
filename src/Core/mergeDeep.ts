/**
 * Deep-merges source objects into target.
 * Arrays are replaced with shallow copies, objects are merged recursively.
 *
 * @param {Record<string, unknown>} target Destination object to mutate.
 * @param {...Record<string, unknown>} sources Source objects.
 * @returns {Record<string, unknown>} Mutated target.
 */
export function mergeDeep (
  target: Record<string, unknown>,
  ...sources: Record<string, unknown>[]
): Record<string, unknown> {
  for (const src of sources) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue
    for (const [k, v] of Object.entries(src)) {
      if (v === undefined) continue
      if (Array.isArray(v)) {
        target[k] = v.slice()
      } else if (v !== null && typeof v === 'object') {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) {
          target[k] = {}
        }
        mergeDeep(target[k] as Record<string, unknown>, v as Record<string, unknown>)
      } else {
        target[k] = v
      }
    }
  }
  return target
}
