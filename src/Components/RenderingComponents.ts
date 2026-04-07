type JsonRecord = Record<string, unknown>

export class SpriteData {
  assetId: string
  tint: number
  anchorX: number
  anchorY: number
  blendMode: string
  shape: string
  circleRadius: number | null
  width: number | null
  height: number | null

  constructor (opts: JsonRecord = {}) {
    this.assetId = opts.assetId != null ? String(opts.assetId) : ''
    this.tint = opts.tint != null ? Number(opts.tint) : 0xffffff
    this.anchorX = opts.anchorX != null ? Number(opts.anchorX) : 0.5
    this.anchorY = opts.anchorY != null ? Number(opts.anchorY) : 0.5
    this.blendMode = opts.blendMode != null ? String(opts.blendMode) : 'normal'
    this.shape = opts.shape != null ? String(opts.shape).toLowerCase() : 'rect'
    this.circleRadius =
      opts.circleRadius != null && Number(opts.circleRadius) > 0
        ? Number(opts.circleRadius)
        : null
    this.width = opts.width != null && Number(opts.width) > 0 ? Number(opts.width) : null
    this.height = opts.height != null && Number(opts.height) > 0 ? Number(opts.height) : null
  }

  static fromJson (json: JsonRecord = {}): SpriteData {
    return new SpriteData({
      assetId: json.assetId,
      tint: json.tint,
      anchorX: json.anchorX,
      anchorY: json.anchorY,
      blendMode: json.blendMode,
      shape: json.shape,
      circleRadius: json.circleRadius,
      width: json.width,
      height: json.height
    })
  }
}

export class TiledSpriteData {
  assetId: string
  tileWidth: number
  tileHeight: number
  width: number
  height: number
  uvScaleX: number
  uvScaleY: number
  tint: number
  blendMode: string

  constructor (opts: JsonRecord = {}) {
    this.assetId = opts.assetId != null ? String(opts.assetId) : ''
    this.tileWidth = Number(opts.tileWidth) || 32
    this.tileHeight = Number(opts.tileHeight) || 32
    this.width = Number(opts.width) || 0
    this.height = Number(opts.height) || 0
    this.uvScaleX = opts.uvScaleX != null ? Number(opts.uvScaleX) : 1
    this.uvScaleY = opts.uvScaleY != null ? Number(opts.uvScaleY) : 1
    this.tint = opts.tint != null ? Number(opts.tint) : 0xffffff
    this.blendMode = opts.blendMode != null ? String(opts.blendMode) : 'normal'
  }

  static fromJson (json: JsonRecord = {}): TiledSpriteData {
    return new TiledSpriteData({
      assetId: json.assetId,
      tileWidth: json.tileWidth,
      tileHeight: json.tileHeight,
      width: json.width,
      height: json.height,
      uvScaleX: json.uvScaleX,
      uvScaleY: json.uvScaleY,
      tint: json.tint,
      blendMode: json.blendMode
    })
  }
}
