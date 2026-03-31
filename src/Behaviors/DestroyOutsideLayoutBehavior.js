import { BaseBehavior } from './BaseBehavior.js';
import { destroyOutsideBehaviorDefaults } from './Config/destroyOutsideBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/destroy-outside
 */
export class DestroyOutsideLayoutBehavior extends BaseBehavior {
  static type = 'destroyOutside';
  static priority = 110;

  static defaultProperties = { ...destroyOutsideBehaviorDefaults };

  applyJsonProperties(json) {
    if (json.marginLeft != null) this.marginLeft = Number(json.marginLeft);
    if (json.marginRight != null) this.marginRight = Number(json.marginRight);
    if (json.marginTop != null) this.marginTop = Number(json.marginTop);
    if (json.marginBottom != null) this.marginBottom = Number(json.marginBottom);
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, layoutWidth, layoutHeight, displaySize, entityId, world, events } = ctx;
    const w = displaySize?.width ?? 0;
    const h = displaySize?.height ?? 0;
    const halfW = (Math.abs(w) * Math.abs(transform.scaleX)) / 2;
    const halfH = (Math.abs(h) * Math.abs(transform.scaleY)) / 2;
    const minX = -this.marginLeft + halfW;
    const maxX = layoutWidth + this.marginRight - halfW;
    const minY = -this.marginTop + halfH;
    const maxY = layoutHeight + this.marginBottom - halfH;
    const x = transform.x;
    const y = transform.y;
    if (x < minX || x > maxX || y < minY || y > maxY) {
      events?.emit('destroyOutside:beforeDestroy', { entityId, x, y });
      world?.destroyEntity(entityId);
    }
  }
}
