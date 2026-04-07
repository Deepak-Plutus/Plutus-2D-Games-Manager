import type { GameConfig } from './GameConfig.js'

function isRecord (v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function ensureArrayIfPresent (root: Record<string, unknown>, key: string): void {
  const v = root[key]
  if (v == null) return
  if (!Array.isArray(v)) throw new Error(`Config field "${key}" must be an array`)
}

function ensureRecordIfPresent (root: Record<string, unknown>, key: string): void {
  const v = root[key]
  if (v == null) return
  if (!isRecord(v)) throw new Error(`Config field "${key}" must be an object`)
}

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
