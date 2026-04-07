import { BaseBehavior } from './BaseBehavior.js'
import type { ColliderAabb } from '../Core/CollisionService.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { physicsBehaviorDefaults } from './Config/physicsBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

export class PhysicsBehavior extends BaseBehavior {
  static type = 'physics'
  static priority = 13
  static defaultProperties = { ...physicsBehaviorDefaults }

  velocityX = 0
  velocityY = 0
  angularVelocity = 0
  gravity = 0
  linearDamping = 0
  angularDamping = 0
  elasticity = 0.2
  friction = 0.1
  maxSpeed = 800
  applyAngularVelocity = true
  private _impulseX = 0
  private _impulseY = 0
  private _impulseAng = 0

  applyJsonProperties (json: JsonRecord): void {
    if (json.velocityX != null) this.velocityX = Number(json.velocityX)
    if (json.velocityY != null) this.velocityY = Number(json.velocityY)
    if (json.angularVelocity != null) this.angularVelocity = Number(json.angularVelocity)
    if (json.gravity != null) this.gravity = Number(json.gravity)
    if (json.linearDamping != null) this.linearDamping = Number(json.linearDamping)
    if (json.angularDamping != null) this.angularDamping = Number(json.angularDamping)
    if (json.elasticity != null) this.elasticity = Number(json.elasticity)
    if (json.friction != null) this.friction = Number(json.friction)
    if (json.maxSpeed != null) this.maxSpeed = Number(json.maxSpeed)
    if (json.applyAngularVelocity != null) this.applyAngularVelocity = !!json.applyAngularVelocity
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, dt, colliders, entityId, displaySize } = ctx
    this.velocityX += this._impulseX
    this.velocityY += this._impulseY
    this._impulseX = 0
    this._impulseY = 0
    const dampLin = Math.max(0, Math.min(1, this.linearDamping * dt))
    this.velocityX *= 1 - dampLin
    this.velocityY *= 1 - dampLin
    this.velocityY += this.gravity * dt
    const sp = Math.hypot(this.velocityX, this.velocityY)
    if (sp > this.maxSpeed && sp > 0) {
      const s = this.maxSpeed / sp
      this.velocityX *= s
      this.velocityY *= s
    }
    let nx = transform.x + this.velocityX * dt
    let ny = transform.y + this.velocityY * dt
    let pvx = this.velocityX
    let pvy = this.velocityY
    if (this.applyAngularVelocity) {
      this.angularVelocity += this._impulseAng
      this._impulseAng = 0
      const dampA = Math.max(0, Math.min(1, this.angularDamping * dt))
      this.angularVelocity *= 1 - dampA
      transform.rotation += this.angularVelocity * dt
    } else {
      this._impulseAng = 0
    }
    const halfW = ((displaySize?.width ?? 32) * Math.abs(transform.scaleX)) / 2
    const halfH = ((displaySize?.height ?? 32) * Math.abs(transform.scaleY)) / 2
    if (colliders?.length) {
      for (let iter = 0; iter < 4; iter++) {
        const res = resolveAabb(nx, ny, halfW, halfH, colliders, entityId, this.elasticity, this.friction, pvx, pvy)
        nx = res.x
        ny = res.y
        pvx = res.vx
        pvy = res.vy
      }
      this.velocityX = pvx
      this.velocityY = pvy
    }
    transform.x = nx
    transform.y = ny
  }
}

function resolveAabb (
  x: number,
  y: number,
  hw: number,
  hh: number,
  colliders: ColliderAabb[],
  selfId: number,
  elasticity: number,
  friction: number,
  vx: number,
  vy: number
): { x: number; y: number; vx: number; vy: number } {
  let outX = x
  let outY = y
  let outVx = vx
  let outVy = vy
  for (const c of colliders) {
    if (c.entityId === selfId || c.kind !== 'solid') continue
    const cl = outX - hw
    const cr = outX + hw
    const ct = outY - hh
    const cb = outY + hh
    if (cr <= c.left || cl >= c.right || cb <= c.top || ct >= c.bottom) continue
    const overlapL = cr - c.left
    const overlapR = c.right - cl
    const overlapT = cb - c.top
    const overlapB = c.bottom - ct
    const minO = Math.min(overlapL, overlapR, overlapT, overlapB)
    if (minO === overlapL) { outX = c.left - hw; outVx *= -elasticity; outVy *= 1 - friction }
    else if (minO === overlapR) { outX = c.right + hw; outVx *= -elasticity; outVy *= 1 - friction }
    else if (minO === overlapT) { outY = c.top - hh; outVy *= -elasticity; outVx *= 1 - friction }
    else { outY = c.bottom + hh; outVy *= -elasticity; outVx *= 1 - friction }
  }
  return { x: outX, y: outY, vx: outVx, vy: outVy }
}
