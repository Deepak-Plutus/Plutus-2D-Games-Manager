type JsonRecord = Record<string, unknown>

export class Transform {
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number

  constructor (x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1) {
    this.x = x
    this.y = y
    this.rotation = rotation
    this.scaleX = scaleX
    this.scaleY = scaleY
  }

  static fromJson (def: JsonRecord = {}): Transform {
    return new Transform(
      Number(def.x) || 0,
      Number(def.y) || 0,
      Number(def.rotation) || 0,
      def.scaleX != null ? Number(def.scaleX) : 1,
      def.scaleY != null ? Number(def.scaleY) : 1
    )
  }
}
