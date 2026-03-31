import { BaseBehavior } from './BaseBehavior.js';
import { COMPONENT_DISPLAY, COMPONENT_TRANSFORM } from '../Components/index.js';
import { persistBehaviorDefaults } from './Config/persistBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/persist
 */
export class PersistBehavior extends BaseBehavior {
  static type = 'persist';
  static priority = 5;

  static defaultProperties = { ...persistBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._didAutoLoad = false;
  }

  applyJsonProperties(json) {
    if (json.storagePrefix != null) this.storagePrefix = String(json.storagePrefix);
    if (json.autoLoad != null) this.autoLoad = !!json.autoLoad;
    if (json.autoSave != null) this.autoSave = !!json.autoSave;
  }

  storageKeyFor(entityId, world) {
    const name = world?.getMetaName(entityId) ?? `id_${entityId}`;
    return `${this.storagePrefix}:${name}`;
  }

  save(world, entityId, transform, displayView) {
    if (typeof localStorage === 'undefined') return;
    const data = {
      x: transform.x,
      y: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      alpha: displayView?.alpha ?? 1,
      visible: displayView?.visible !== false,
    };
    try {
      localStorage.setItem(this.storageKeyFor(entityId, world), JSON.stringify(data));
    } catch {
      /* quota */
    }
  }

  load(world, entityId, transform, displayView) {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(this.storageKeyFor(entityId, world));
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (typeof data.x === 'number') transform.x = data.x;
      if (typeof data.y === 'number') transform.y = data.y;
      if (typeof data.rotation === 'number') transform.rotation = data.rotation;
      if (typeof data.scaleX === 'number') transform.scaleX = data.scaleX;
      if (typeof data.scaleY === 'number') transform.scaleY = data.scaleY;
      if (displayView) {
        if (typeof data.alpha === 'number') displayView.alpha = data.alpha;
        if (typeof data.visible === 'boolean') displayView.visible = data.visible;
      }
      return true;
    } catch {
      return false;
    }
  }

  clearSaved(world, entityId) {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.storageKeyFor(entityId, world));
  }

  /** @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx */
  saveFromContext(ctx) {
    if (!ctx.world) return;
    this.save(ctx.world, ctx.entityId, ctx.transform, ctx.displayView ?? null);
  }

  /** @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx */
  loadFromContext(ctx) {
    if (!ctx.world) return false;
    return this.load(ctx.world, ctx.entityId, ctx.transform, ctx.displayView ?? null);
  }

  /** @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx */
  clearSavedFromContext(ctx) {
    if (!ctx.world) return;
    this.clearSaved(ctx.world, ctx.entityId);
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { world, entityId, transform, displayView } = ctx;
    if (!world) return;

    if (this.autoLoad && !this._didAutoLoad) {
      this._didAutoLoad = true;
      this.load(world, entityId, transform, displayView ?? null);
    }
  }
}
