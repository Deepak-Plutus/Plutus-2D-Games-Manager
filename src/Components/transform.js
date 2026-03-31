/**
 * Position / rotation / scale component data (plain mutable object for ECS + behaviors).
 */
export class Transform {
  /**
   * @param {number} [x]
   * @param {number} [y]
   * @param {number} [rotation] radians
   * @param {number} [scaleX]
   * @param {number} [scaleY]
   */
  constructor(x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1) {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  /**
   * @param {Record<string, unknown>} [def]
   */
  static fromJson(def = {}) {
    return new Transform(
      Number(def.x) || 0,
      Number(def.y) || 0,
      Number(def.rotation) || 0,
      def.scaleX != null ? Number(def.scaleX) : 1,
      def.scaleY != null ? Number(def.scaleY) : 1,
    );
  }
}
