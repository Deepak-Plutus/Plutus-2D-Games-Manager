import type { Container } from 'pixi.js'
import { COMPONENT_DISPLAY, COMPONENT_GROUP, COMPONENT_META } from '../Components/index.js'

type EntityRecord = { id: number; components: Map<string, unknown> }
type MetaShape = { name?: unknown; uid?: unknown; tags?: unknown; objectType?: unknown }
type GroupShape = { parentEntityId?: unknown; hasGroup?: (groupId: string) => boolean }
type DisplayShape = { view?: (Container & { parent?: Container | null; destroy?: (opts?: unknown) => void }) | null }

export class World {
  private _nextId: number
  entities: Map<number, EntityRecord>
  private _displayOrphanRoot: Container | null

  constructor () {
    this._nextId = 1
    this.entities = new Map()
    this._displayOrphanRoot = null
  }

  setDisplayOrphanRoot (container: Container | null): void {
    this._displayOrphanRoot = container
  }

  createEntity (): number {
    const id = this._nextId++
    const entity: EntityRecord = { id, components: new Map() }
    this.entities.set(id, entity)
    return id
  }

  setComponent (entityId: number, name: string, data: unknown): void {
    const e = this.entities.get(entityId)
    if (!e) return
    e.components.set(name, data)
  }

  removeComponent (entityId: number, name: string): void {
    this.entities.get(entityId)?.components.delete(name)
  }

  getComponent<T = unknown> (entityId: number, name: string): T | undefined {
    return this.entities.get(entityId)?.components.get(name) as T | undefined
  }

  query (...names: string[]): EntityRecord[] {
    const out: EntityRecord[] = []
    for (const e of this.entities.values()) {
      if (names.every(n => e.components.has(n))) out.push(e)
    }
    return out
  }

  findEntityIdByMetaName (name: string): number | null {
    for (const e of this.entities.values()) {
      const m = e.components.get(COMPONENT_META) as MetaShape | undefined
      if (m && String(m.name) === String(name)) return e.id
    }
    return null
  }

  getMetaName (entityId: number): string | null {
    const m = this.entities.get(entityId)?.components.get(COMPONENT_META) as MetaShape | undefined
    if (!m || m.name == null) return null
    return String(m.name)
  }

  findEntityIdByUid (uid: number): number | null {
    const u = Number(uid)
    for (const e of this.entities.values()) {
      const m = e.components.get(COMPONENT_META) as MetaShape | undefined
      if (m && Number(m.uid) === u) return e.id
    }
    return null
  }

  findEntityIdsByTag (tag: string): number[] {
    const t = String(tag)
    const out: number[] = []
    for (const e of this.entities.values()) {
      const m = e.components.get(COMPONENT_META) as MetaShape | undefined
      const tags = m?.tags
      if (Array.isArray(tags) && tags.includes(t)) out.push(e.id)
    }
    return out
  }

  findEntityIdsByObjectType (objectType: string): number[] {
    const o = String(objectType)
    const out: number[] = []
    for (const e of this.entities.values()) {
      const m = e.components.get(COMPONENT_META) as MetaShape | undefined
      if (m && String(m.objectType ?? '') === o) out.push(e.id)
    }
    return out
  }

  findEntityIdsInGroup (groupId: string): number[] {
    const g = String(groupId)
    const out: number[] = []
    for (const e of this.entities.values()) {
      const gm = e.components.get(COMPONENT_GROUP) as GroupShape | undefined
      if (gm && typeof gm.hasGroup === 'function' && gm.hasGroup(g)) out.push(e.id)
    }
    return out
  }

  destroyEntity (entityId: number): void {
    const e = this.entities.get(entityId)
    if (!e) return
    const disp = e.components.get(COMPONENT_DISPLAY) as DisplayShape | undefined
    const view = disp?.view
    const root = this._displayOrphanRoot

    if (view && root) {
      for (const o of this.entities.values()) {
        if (o.id === entityId) continue
        const grp = o.components.get(COMPONENT_GROUP) as GroupShape | undefined
        if (grp?.parentEntityId !== entityId) continue
        const cv = (o.components.get(COMPONENT_DISPLAY) as DisplayShape | undefined)?.view
        if (cv && cv.parent === view) root.addChild(cv)
      }
    }

    if (view?.parent) view.parent.removeChild(view)
    view?.destroy?.({ children: false })
    this.entities.delete(entityId)
  }
}
