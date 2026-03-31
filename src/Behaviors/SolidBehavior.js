import { BaseBehavior } from './BaseBehavior.js';
import { solidBehaviorDefaults } from './Config/solidBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/solid
 */
export class SolidBehavior extends BaseBehavior {
  static type = 'solid';
  static priority = 5;

  static defaultProperties = { ...solidBehaviorDefaults };

  applyJsonProperties(json) {
    if (json.collisionWidth != null) this.collisionWidth = Number(json.collisionWidth);
    if (json.collisionHeight != null) this.collisionHeight = Number(json.collisionHeight);
    if (json.offsetX != null) this.offsetX = Number(json.offsetX);
    if (json.offsetY != null) this.offsetY = Number(json.offsetY);
  }

  getCollisionContribution() {
    return {
      kind: 'solid',
      width: this.collisionWidth,
      height: this.collisionHeight,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    };
  }
}
