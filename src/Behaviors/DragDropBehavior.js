import { BaseBehavior } from './BaseBehavior.js';
import { dragDropBehaviorDefaults } from './Config/dragDropBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/drag-drop
 */
export class DragDropBehavior extends BaseBehavior {
  static type = 'dragDrop';
  static priority = 25;

  static defaultProperties = { ...dragDropBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    this._wired = false;
    /** @private */
    this._drag = false;
    /** @private */
    this._offX = 0;
    /** @private */
    this._offY = 0;
    /** @private */
    this._baseZ = 0;
  }

  applyJsonProperties(json) {
    if (json.axes != null) this.axes = String(json.axes);
    if (json.dragThreshold != null) this.dragThreshold = Number(json.dragThreshold);
    if (json.dragZOffset != null) this.dragZOffset = Number(json.dragZOffset);
  }

  drop() {
    this._drag = false;
  }

  isDragging() {
    return this._drag;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled() || !ctx.displayView) return;
    const view = ctx.displayView;
    const pointer = ctx.pointer;

    if (!this._wired) {
      this._wired = true;
      this._baseZ = view.zIndex ?? 0;
      view.eventMode = 'static';
      view.cursor = 'pointer';
      view.on('pointerdown', (e) => {
        if (!this.isEnabled()) return;
        const parent = view.parent;
        if (!parent) return;
        const lp = e.getLocalPosition(parent);
        this._drag = true;
        this._offX = ctx.transform.x - lp.x;
        this._offY = ctx.transform.y - lp.y;
        view.zIndex = this._baseZ + this.dragZOffset;
        parent.sortableChildren = true;
        ctx.events?.emit('dragDrop:dragStart', { entityId: ctx.entityId });
      });
    }

    if (this._drag) {
      if (!pointer?.isDown) {
        this._drag = false;
        view.zIndex = this._baseZ;
        ctx.events?.emit('dragDrop:drop', { entityId: ctx.entityId });
        return;
      }
      if (this.axes !== 'vertical') ctx.transform.x = pointer.x + this._offX;
      if (this.axes !== 'horizontal') ctx.transform.y = pointer.y + this._offY;
      ctx.events?.emit('dragDrop:dragMove', {
        entityId: ctx.entityId,
        x: ctx.transform.x,
        y: ctx.transform.y,
      });
    }
  }
}
