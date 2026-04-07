import type { GameConfig } from './GameConfig.js'

/**
 * Checks whether a value is a non-array object record.
 *
 * @param {unknown} v Value to inspect.
 * @returns {v is Record<string, unknown>} True when value is a non-array object.
 */
function isRecord (v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Ensures a key is an array when present.
 *
 * @param {Record<string, unknown>} root Config root object.
 * @param {string} key Field key.
 * @returns {void} Nothing.
 */
function ensureArrayIfPresent (root: Record<string, unknown>, key: string): void {
  const v = root[key]
  if (v == null) return
  if (!Array.isArray(v)) throw new Error(`Config field "${key}" must be an array`)
}

/**
 * Ensures a key is an object record when present.
 *
 * @param {Record<string, unknown>} root Config root object.
 * @param {string} key Field key.
 * @returns {void} Nothing.
 */
function ensureRecordIfPresent (root: Record<string, unknown>, key: string): void {
  const v = root[key]
  if (v == null) return
  if (!isRecord(v)) throw new Error(`Config field "${key}" must be an object`)
}

/**
 * Validates top-level config shape before runtime usage.
 *
 * @param {Record<string, unknown>} root Parsed config object.
 * @returns {asserts root is GameConfig} Narrows `root` to validated `GameConfig`.
 */
export function validateGameConfigShape (root: Record<string, unknown>): asserts root is GameConfig {
  ensureRecordIfPresent(root, 'app')
  ensureRecordIfPresent(root, 'systems')
  ensureRecordIfPresent(root, 'input')
  ensureArrayIfPresent(root, 'layers')
  ensureArrayIfPresent(root, 'objectTypes')
  ensureArrayIfPresent(root, 'assets')
  ensureArrayIfPresent(root, 'entities')
  ensureArrayIfPresent(root, 'systemsOrder')
  if (Array.isArray(root.systemsOrder) && root.systemsOrder.some(v => typeof v !== 'string')) {
    throw new Error('Config field "systemsOrder" must be an array of strings')
  }
}
