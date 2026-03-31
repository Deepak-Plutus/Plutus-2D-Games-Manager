import { BaseBehavior } from './BaseBehavior.js';

/**
 * Keeps the instance inside the layout bounds (Construct: Bound to layout).
 *
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/bound-to-layout
 */
export class BoundToLayoutBehavior extends BaseBehavior {
  static type = 'boundToLayout';
  static priority = 100;

  static defaultProperties = {
    /** `edge` — full box stays inside; `origin` — only transform origin is clamped */
    boundBy: 'edge',
  };

  applyJsonProperties(json) {
    if (json.boundBy != null) this.boundBy = String(json.boundBy);
  }

  get boundByMode() {
    return this.boundBy === 'origin' ? 'origin' : 'edge';
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;

    const { transform, layoutWidth, layoutHeight, displaySize } = ctx;
    const w = displaySize?.width ?? 0;
    const h = displaySize?.height ?? 0;
    const sx = Math.abs(transform.scaleX);
    const sy = Math.abs(transform.scaleY);
    const halfW = (w * sx) / 2;
    const halfH = (h * sy) / 2;

    if (this.boundByMode === 'origin') {
      transform.x = clamp(transform.x, 0, layoutWidth);
      transform.y = clamp(transform.y, 0, layoutHeight);
    } else {
      const minX = halfW;
      const maxX = layoutWidth - halfW;
      const minY = halfH;
      const maxY = layoutHeight - halfH;
      if (minX <= maxX) transform.x = clamp(transform.x, minX, maxX);
      else transform.x = layoutWidth / 2;
      if (minY <= maxY) transform.y = clamp(transform.y, minY, maxY);
      else transform.y = layoutHeight / 2;
    }
  }
}

/**
 * @param {number} v
 * @param {number} min
 * @param {number} max
 */
function clamp(v, min, max) {
  if (min > max) return v;
  return Math.max(min, Math.min(max, v));
}
