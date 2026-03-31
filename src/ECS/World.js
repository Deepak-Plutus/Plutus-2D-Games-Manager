import { COMPONENT_DISPLAY, COMPONENT_GROUP, COMPONENT_META } from '../Components/index.js';

/**
 * Minimal ECS world: entity ids + named component bags (Construct-style data on instances).
 */
export class World {
  constructor() {
    this._nextId = 1;
    /** @type {Map<number, { id: number, components: Map<string, unknown> }>} */
    this.entities = new Map();
    /** Reparent grouped displays when their parent entity is destroyed */
    /** @type {import('pixi.js').Container | null} */
    this._displayOrphanRoot = null;
  }

  /**
   * @param {import('pixi.js').Container | null} container
   */
  setDisplayOrphanRoot(container) {
    this._displayOrphanRoot = container;
  }

  createEntity() {
    const id = this._nextId++;
    const entity = { id, components: new Map() };
    this.entities.set(id, entity);
    return id;
  }

  /**
   * @param {number} entityId
   * @param {string} name
   * @param {unknown} data
   */
  setComponent(entityId, name, data) {
    const e = this.entities.get(entityId);
    if (!e) return;
    e.components.set(name, data);
  }

  /**
   * @param {number} entityId
   * @param {string} name
   */
  removeComponent(entityId, name) {
    this.entities.get(entityId)?.components.delete(name);
  }

  /**
   * @param {number} entityId
   * @param {string} name
   */
  getComponent(entityId, name) {
    return this.entities.get(entityId)?.components.get(name);
  }

  /**
   * @param {...string} names
   * @returns {Array<{ id: number, components: Map<string, unknown> }>}
   */
  query(...names) {
    const out = [];
    for (const e of this.entities.values()) {
      if (names.every((n) => e.components.has(n))) {
        out.push(e);
      }
    }
    return out;
  }

  /**
   * @param {string} name meta.name value
   * @returns {number | null}
   */
  findEntityIdByMetaName(name) {
    for (const e of this.entities.values()) {
      const m = e.components.get(COMPONENT_META);
      if (m && String(m.name) === String(name)) return e.id;
    }
    return null;
  }

  /**
   * @param {number} entityId
   * @returns {string | null}
   */
  getMetaName(entityId) {
    const m = this.entities.get(entityId)?.components.get(COMPONENT_META);
    if (!m || m.name == null) return null;
    return String(m.name);
  }

  /**
   * @param {number} uid
   * @returns {number | null} entity id
   */
  findEntityIdByUid(uid) {
    const u = Number(uid);
    for (const e of this.entities.values()) {
      const m = e.components.get(COMPONENT_META);
      if (m && Number(m.uid) === u) return e.id;
    }
    return null;
  }

  /**
   * @param {string} tag
   * @returns {number[]} entity ids
   */
  findEntityIdsByTag(tag) {
    const t = String(tag);
    const out = [];
    for (const e of this.entities.values()) {
      const m = e.components.get(COMPONENT_META);
      const tags = m?.tags;
      if (Array.isArray(tags) && tags.includes(t)) out.push(e.id);
    }
    return out;
  }

  /**
   * @param {string} objectType template id from `objectTypes`
   * @returns {number[]} entity ids
   */
  findEntityIdsByObjectType(objectType) {
    const o = String(objectType);
    const out = [];
    for (const e of this.entities.values()) {
      const m = e.components.get(COMPONENT_META);
      if (m && String(m.objectType ?? '') === o) out.push(e.id);
    }
    return out;
  }

  /**
   * @param {string} groupId
   * @returns {number[]}
   */
  findEntityIdsInGroup(groupId) {
    const g = String(groupId);
    const out = [];
    for (const e of this.entities.values()) {
      const gm = e.components.get(COMPONENT_GROUP);
      if (gm && typeof gm.hasGroup === 'function' && gm.hasGroup(g)) out.push(e.id);
    }
    return out;
  }

  /**
   * @param {number} entityId
   */
  destroyEntity(entityId) {
    const e = this.entities.get(entityId);
    if (!e) return;
    const disp = e.components.get(COMPONENT_DISPLAY);
    const view = disp?.view;
    const root = this._displayOrphanRoot;

    if (view && root) {
      for (const o of this.entities.values()) {
        if (o.id === entityId) continue;
        const grp = o.components.get(COMPONENT_GROUP);
        if (grp?.parentEntityId !== entityId) continue;
        const cv = o.components.get(COMPONENT_DISPLAY)?.view;
        if (cv && cv.parent === view) {
          root.addChild(cv);
        }
      }
    }

    if (view?.parent) view.parent.removeChild(view);
    view?.destroy?.({ children: false });
    this.entities.delete(entityId);
  }
}
