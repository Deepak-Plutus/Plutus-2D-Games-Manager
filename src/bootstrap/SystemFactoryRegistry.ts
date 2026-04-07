import type { GameConfig } from '../Core/GameConfig.js'
import type { BaseSystem } from '../Systems/BaseSystem.js'

export type SystemPhase = 'pre' | 'gameplay' | 'post'

export type SystemFactoryDefinition = {
  name: string
  create: () => BaseSystem
  phase?: SystemPhase
  after?: string[]
  requiresConfigBlocks?: string[]
  isEnabled?: (config: GameConfig) => boolean
}

export type SystemFactoryEntry = { name: string; system: BaseSystem }

function hasConfigBlock (config: GameConfig, key: string): boolean {
  const v = config[key]
  if (v == null) return false
  if (typeof v === 'object') return true
  return true
}

function compareByPhase (a: SystemFactoryDefinition, b: SystemFactoryDefinition): number {
  const rank: Record<SystemPhase, number> = { pre: 0, gameplay: 1, post: 2 }
  return (rank[a.phase ?? 'gameplay'] ?? 1) - (rank[b.phase ?? 'gameplay'] ?? 1)
}

function topoSort (defs: SystemFactoryDefinition[]): SystemFactoryDefinition[] {
  const orderedByPhase = [...defs].sort(compareByPhase)
  const byName = new Map(orderedByPhase.map(d => [d.name, d] as const))
  const temp = new Set<string>()
  const perm = new Set<string>()
  const out: SystemFactoryDefinition[] = []

  const visit = (name: string): void => {
    if (perm.has(name)) return
    if (temp.has(name)) return
    temp.add(name)
    const d = byName.get(name)
    if (!d) return
    for (const dep of d.after ?? []) {
      if (byName.has(dep)) visit(dep)
    }
    temp.delete(name)
    perm.add(name)
    out.push(d)
  }

  for (const d of orderedByPhase) visit(d.name)
  return out
}

export class SystemFactoryRegistry {
  private _definitions: SystemFactoryDefinition[] = []

  register (definition: SystemFactoryDefinition): void {
    this._definitions.push(definition)
  }

  resolveForConfig (config: GameConfig, systemsOrder: string[] = []): SystemFactoryEntry[] {
    const enabledDefs = this._definitions.filter(def => {
      const requires = def.requiresConfigBlocks ?? []
      if (requires.length && !requires.every(k => hasConfigBlock(config, k))) return false
      if (typeof def.isEnabled === 'function') return def.isEnabled(config)
      return true
    })
    const ordered = topoSort(enabledDefs)
    const orderedByName = new Map(ordered.map(def => [def.name, def] as const))
    const explicit = systemsOrder
      .map(name => orderedByName.get(name))
      .filter((def): def is SystemFactoryDefinition => !!def)
    const seen = new Set(explicit.map(def => def.name))
    const mergedOrder = [...explicit, ...ordered.filter(def => !seen.has(def.name))]
    return mergedOrder.map(def => ({ name: def.name, system: def.create() }))
  }
}
