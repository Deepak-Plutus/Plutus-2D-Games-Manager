import { BaseBehavior } from './BaseBehavior.js';
import { jumpThruBehaviorDefaults } from './Config/jumpThruBehaviorConfig.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/jump-thru
 */
export class JumpThruBehavior extends BaseBehavior {
  static type = 'jumpThru';
  static priority = 5;

  static defaultProperties = { ...jumpThruBehaviorDefaults };

  applyJsonProperties(json) {
    if (json.collisionWidth != null) this.collisionWidth = Number(json.collisionWidth);
    if (json.collisionHeight != null) this.collisionHeight = Number(json.collisionHeight);
    if (json.offsetX != null) this.offsetX = Number(json.offsetX);
    if (json.offsetY != null) this.offsetY = Number(json.offsetY);
  }

  getCollisionContribution() {
    return {
      kind: 'jumpThru',
      width: this.collisionWidth,
      height: this.collisionHeight,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    };
  }
}
