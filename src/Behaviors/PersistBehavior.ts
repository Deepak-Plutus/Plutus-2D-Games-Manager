import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { persistBehaviorDefaults } from './Config/persistBehaviorConfig.js'

export class PersistBehavior extends BaseBehavior {
  static type = 'persist'
  static priority = 5
  static defaultProperties = { ...persistBehaviorDefaults }

  storagePrefix = 'plutus_persist'
  autoLoad = false
  autoSave = false
  private _didAutoLoad = false

  applyJsonProperties (json: Record<string, unknown>): void {
    if (json.storagePrefix != null) this.storagePrefix = String(json.storagePrefix)
    if (json.autoLoad != null) this.autoLoad = !!json.autoLoad
    if (json.autoSave != null) this.autoSave = !!json.autoSave
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { world, entityId, transform, displayView } = ctx
    if (!world || !this.autoLoad || this._didAutoLoad || typeof localStorage === 'undefined') return
    this._didAutoLoad = true
    const name = world.getMetaName(entityId) ?? `id_${entityId}`
    const raw = localStorage.getItem(`${this.storagePrefix}:${name}`)
    if (!raw) return
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      if (typeof data.x === 'number') transform.x = data.x
      if (typeof data.y === 'number') transform.y = data.y
      if (typeof data.rotation === 'number') transform.rotation = data.rotation
      if (typeof data.scaleX === 'number') transform.scaleX = data.scaleX
      if (typeof data.scaleY === 'number') transform.scaleY = data.scaleY
      if (displayView) {
        const v = displayView as { alpha?: number; visible?: boolean }
        if (typeof data.alpha === 'number') v.alpha = data.alpha
        if (typeof data.visible === 'boolean') v.visible = data.visible
      }
    } catch {}
  }
}
