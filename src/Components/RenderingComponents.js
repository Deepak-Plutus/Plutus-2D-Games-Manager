/**
 * Sprite / tiled rendering metadata (pairs with {@link COMPONENT_DISPLAY} + Transform).
 */
export class SpriteData {
  /**
   * @param {object} opts
   */
  constructor(opts = {}) {
    this.assetId = opts.assetId != null ? String(opts.assetId) : '';
    this.tint = opts.tint != null ? Number(opts.tint) : 0xffffff;
    this.anchorX = opts.anchorX != null ? Number(opts.anchorX) : 0.5;
    this.anchorY = opts.anchorY != null ? Number(opts.anchorY) : 0.5;
    this.blendMode = opts.blendMode != null ? String(opts.blendMode) : 'normal';
    /** `rect` (texture quad) or `circle` ({@link Graphics} disk, size from {@link #circleRadius} or transform). */
    this.shape = opts.shape != null ? String(opts.shape).toLowerCase() : 'rect';
    /** Pixel radius when {@link #shape} is `circle`; omit to use half of min(|scaleX|, |scaleY|) on the entity transform. */
    this.circleRadius =
      opts.circleRadius != null && Number(opts.circleRadius) > 0 ? Number(opts.circleRadius) : null;
    /** Optional explicit render size in pixels (overrides asset dimensions when provided). */
    this.width = opts.width != null && Number(opts.width) > 0 ? Number(opts.width) : null;
    this.height = opts.height != null && Number(opts.height) > 0 ? Number(opts.height) : null;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new SpriteData({
      assetId: json.assetId,
      tint: json.tint,
      anchorX: json.anchorX,
      anchorY: json.anchorY,
      blendMode: json.blendMode,
      shape: json.shape,
      circleRadius: json.circleRadius,
      width: json.width,
      height: json.height,
    });
  }
}

export class TiledSpriteData {
  /**
   * @param {object} opts
   */
  constructor(opts = {}) {
    this.assetId = opts.assetId != null ? String(opts.assetId) : '';
    this.tileWidth = Number(opts.tileWidth) || 32;
    this.tileHeight = Number(opts.tileHeight) || 32;
    this.width = Number(opts.width) || 0;
    this.height = Number(opts.height) || 0;
    this.uvScaleX = opts.uvScaleX != null ? Number(opts.uvScaleX) : 1;
    this.uvScaleY = opts.uvScaleY != null ? Number(opts.uvScaleY) : 1;
    this.tint = opts.tint != null ? Number(opts.tint) : 0xffffff;
    this.blendMode = opts.blendMode != null ? String(opts.blendMode) : 'normal';
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new TiledSpriteData({
      assetId: json.assetId,
      tileWidth: json.tileWidth,
      tileHeight: json.tileHeight,
      width: json.width,
      height: json.height,
      uvScaleX: json.uvScaleX,
      uvScaleY: json.uvScaleY,
      tint: json.tint,
      blendMode: json.blendMode,
    });
  }
}
