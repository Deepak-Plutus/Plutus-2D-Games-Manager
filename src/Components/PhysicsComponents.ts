type JsonRecord = Record<string, unknown>

export class Velocity {
  x: number
  y: number

  constructor (x: unknown = 0, y: unknown = 0) {
    this.x = Number(x) || 0
    this.y = Number(y) || 0
  }

  static fromJson (json: JsonRecord = {}): Velocity {
    return new Velocity(json.x, json.y)
  }
}

export class Acceleration {
  x: number
  y: number

  constructor (x: unknown = 0, y: unknown = 0) {
    this.x = Number(x) || 0
    this.y = Number(y) || 0
  }

  static fromJson (json: JsonRecord = {}): Acceleration {
    return new Acceleration(json.x, json.y)
  }
}

export class Mass {
  value: number

  constructor (value: unknown = 1) {
    this.value = Math.max(1e-6, Number(value) || 1)
  }

  static fromJson (json: JsonRecord = {}): Mass {
    return new Mass(json.value ?? json.mass)
  }
}

export class RigidBody {
  bodyType: string
  friction: number
  restitution: number
  linearDamping: number
  angularDamping: number
  fixedRotation: boolean

  constructor (opts: JsonRecord = {}) {
    this.bodyType = String(opts.bodyType ?? 'kinematic')
    this.friction = Number(opts.friction) || 0
    const rest = Number(opts.restitution)
    this.restitution = Number.isFinite(rest) ? rest : 0
    this.linearDamping = Number(opts.linearDamping) || 0
    this.angularDamping = Number(opts.angularDamping) || 0
    this.fixedRotation = !!opts.fixedRotation
  }

  static fromJson (json: JsonRecord = {}): RigidBody {
    return new RigidBody(json)
  }
}

export type CollisionShape = {
  kind: string
  width: number
  height: number
  offsetX: number
  offsetY: number
}

export class Collider {
  kind: string
  width: number
  height: number
  offsetX: number
  offsetY: number
  isTrigger: boolean
  layerMask: number

  constructor (opts: JsonRecord = {}) {
    this.kind = String(opts.kind ?? 'solid')
    this.width = Number(opts.width) || 0
    this.height = Number(opts.height) || 0
    this.offsetX = Number(opts.offsetX) || 0
    this.offsetY = Number(opts.offsetY) || 0
    this.isTrigger = !!opts.isTrigger
    this.layerMask = Number(opts.layerMask) || 0xffffffff
  }

  static fromJson (json: JsonRecord = {}): Collider {
    return new Collider(json)
  }

  toCollisionShape (): CollisionShape {
    return {
      kind: this.kind,
      width: this.width,
      height: this.height,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    }
  }
}
