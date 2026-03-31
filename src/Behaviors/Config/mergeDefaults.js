/**
 * Deep-merge JSON onto a defaults object (for behavior property bags).
 * Does not clone functions; skips `type`.
 * @param {Record<string, unknown>} base
 * @param {Record<string, unknown>} [json]
 */
export function mergeBehaviorDefaults(base, json) {
  const out = structuredClone(base);
  if (!json || typeof json !== 'object') return out;
  for (const [k, v] of Object.entries(json)) {
    if (k === 'type') continue;
    if (v === undefined) continue;
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof out[k] === 'object' &&
      out[k] !== null &&
      !Array.isArray(out[k])
    ) {
      out[k] = mergeBehaviorDefaults(/** @type {Record<string, unknown>} */ (out[k]), /** @type {Record<string, unknown>} */ (v));
    } else {
      out[k] = v;
    }
  }
  return out;
}
