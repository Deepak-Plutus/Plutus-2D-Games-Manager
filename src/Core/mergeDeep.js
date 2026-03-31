/**
 * Deep-merge plain objects. Arrays are replaced (not concatenated). Skips `undefined` values.
 * @param {Record<string, unknown>} target
 * @param {...Record<string, unknown>} sources
 * @returns {Record<string, unknown>}
 */
export function mergeDeep(target, ...sources) {
  for (const src of sources) {
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    for (const [k, v] of Object.entries(src)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) {
        target[k] = v.slice();
      } else if (v !== null && typeof v === 'object') {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) {
          target[k] = {};
        }
        mergeDeep(/** @type {Record<string, unknown>} */ (target[k]), /** @type {Record<string, unknown>} */ (v));
      } else {
        target[k] = v;
      }
    }
  }
  return target;
}
