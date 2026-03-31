import { BaseBehavior } from './BaseBehavior.js';
import { COMPONENT_DISPLAY, COMPONENT_TRANSFORM } from '../Components/index.js';
import { pinBehaviorDefaults } from './Config/pinBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/pin
 */
export class PinBehavior extends BaseBehavior {
  static type = 'pin';
  static priority = 92;

  static defaultProperties = { ...pinBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._relX = 0;
    /** @private */
    this._relY = 0;
    /** @private */
    this._relRot = 0;
    /** @private */
    this._relW = 0;
    /** @private */
    this._relH = 0;
    /** @private */
    this._scaleWX = 1;
    /** @private */
    this._scaleHY = 1;
  }

  applyJsonProperties(json) {
    if (json.pinned != null) this.pinned = !!json.pinned;
    if (json.pinnedObjectName != null) this.pinnedObjectName = String(json.pinnedObjectName);
    if (json.pinX != null) this.pinX = !!json.pinX;
    if (json.pinY != null) this.pinY = !!json.pinY;
    if (json.pinAngle != null) this.pinAngle = !!json.pinAngle;
    if (json.pinWidth != null) this.pinWidth = !!json.pinWidth;
    if (json.pinHeight != null) this.pinHeight = !!json.pinHeight;
    if (json.widthMode != null) this.widthMode = String(json.widthMode);
    if (json.heightMode != null) this.heightMode = String(json.heightMode);
    if (json.destroyWithPinned != null) this.destroyWithPinned = !!json.destroyWithPinned;
  }

  /**
   * @param {string} targetName meta.name
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  pinToObject(targetName, ctx) {
    const { world, entityId, transform, displayView } = ctx;
    if (!world) return;
    const tid = world.findEntityIdByMetaName(targetName);
    if (tid == null) return;
    const ttr = world.getComponent(tid, COMPONENT_TRANSFORM);
    if (!ttr) return;
    const td = world.getComponent(tid, COMPONENT_DISPLAY);
    const tv = td?.view;

    this.pinnedObjectName = String(targetName);
    this._relX = transform.x - ttr.x;
    this._relY = transform.y - ttr.y;
    this._relRot = transform.rotation - ttr.rotation;

    const sw = displayView?.width ?? 0;
    const sh = displayView?.height ?? 0;
    const tw = (tv?.width ?? sw) || 1;
    const th = (tv?.height ?? sh) || 1;

    if (this.widthMode === 'scale') this._scaleWX = sw / tw;
    else this._relW = sw - tw;

    if (this.heightMode === 'scale') this._scaleHY = sh / th;
    else this._relH = sh - th;

    this.pinned = true;
  }

  unpin() {
    this.pinned = false;
    this.pinnedObjectName = '';
  }

  setDestroyWithPinned(v) {
    this.destroyWithPinned = !!v;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled() || !this.pinned || !this.pinnedObjectName) return;
    const { world, entityId, transform, displayView } = ctx;
    if (!world) return;

    const tid = world.findEntityIdByMetaName(this.pinnedObjectName);
    if (tid == null) {
      if (this.destroyWithPinned) world.destroyEntity(entityId);
      this.pinned = false;
      return;
    }

    const ttr = world.getComponent(tid, COMPONENT_TRANSFORM);
    if (!ttr) return;
    const td = world.getComponent(tid, COMPONENT_DISPLAY);
    const tv = td?.view;

    if (this.pinX) transform.x = ttr.x + this._relX;
    if (this.pinY) transform.y = ttr.y + this._relY;
    if (this.pinAngle) transform.rotation = ttr.rotation + this._relRot;

    if (displayView && tv) {
      if (this.pinWidth) {
        if (this.widthMode === 'scale') displayView.width = tv.width * this._scaleWX;
        else displayView.width = tv.width + this._relW;
      }
      if (this.pinHeight) {
        if (this.heightMode === 'scale') displayView.height = tv.height * this._scaleHY;
        else displayView.height = tv.height + this._relH;
      }
    }
  }
}
