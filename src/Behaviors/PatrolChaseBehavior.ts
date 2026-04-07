import { BaseBehavior } from './BaseBehavior.js'
import { COMPONENT_TRANSFORM } from '../Components/index.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import type { ColliderAabb } from '../Core/CollisionService.js'
import { patrolChaseBehaviorDefaults } from './Config/patrolChaseBehaviorConfig.js'

export class PatrolChaseBehavior extends BaseBehavior {
  static type = 'patrolChase'
  static priority = 18
  static defaultProperties = { ...patrolChaseBehaviorDefaults }

  targetName = ''
  enableChase = false
  mode = 'ground'
  patrolSpeed = 72
  chaseSpeed = 125
  losRange = 440
  rayStep = 12
  coneOfView = 360
  patrolMinX = 0
  patrolMaxX = 0
  ampX = 70
  ampY = 45
  patrolPeriod = 4.5
  gravity = 1700
  maxFallSpeed = 900
  private _dir = -1
  private _spawnX: number | null = null
  private _spawnY: number | null = null
  private _vy = 0

  applyJsonProperties (json: Record<string, unknown>): void {
    if (json.targetName != null) this.targetName = String(json.targetName)
    if (json.enableChase != null) this.enableChase = !!json.enableChase
    if (json.mode != null) this.mode = String(json.mode).toLowerCase()
    if (json.patrolSpeed != null) this.patrolSpeed = Number(json.patrolSpeed)
    if (json.chaseSpeed != null) this.chaseSpeed = Number(json.chaseSpeed)
    if (json.losRange != null) this.losRange = Number(json.losRange)
    if (json.rayStep != null) this.rayStep = Number(json.rayStep)
    if (json.coneOfView != null) this.coneOfView = Number(json.coneOfView)
    if (json.patrolMinX != null) this.patrolMinX = Number(json.patrolMinX)
    if (json.patrolMaxX != null) this.patrolMaxX = Number(json.patrolMaxX)
    if (json.ampX != null) this.ampX = Number(json.ampX)
    if (json.ampY != null) this.ampY = Number(json.ampY)
    if (json.patrolPeriod != null) this.patrolPeriod = Number(json.patrolPeriod)
    if (json.gravity != null) this.gravity = Number(json.gravity)
    if (json.maxFallSpeed != null) this.maxFallSpeed = Number(json.maxFallSpeed)
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled() || !ctx.world) return
    const { transform, dt, entityId, time, colliders } = ctx
    const list = colliders ?? []
    const tid = this.enableChase && this.targetName ? ctx.world.findEntityIdByMetaName(this.targetName) : null
    const ttr = tid != null ? (ctx.world.getComponent(tid, COMPONENT_TRANSFORM) as { x: number; y: number } | undefined) : undefined
    if (this._spawnX == null) {
      this._spawnX = transform.x; this._spawnY = transform.y
      if (this.mode === 'ground' && this.patrolMinX === 0 && this.patrolMaxX === 0) { this.patrolMinX = transform.x - 80; this.patrolMaxX = transform.x + 80 }
    }
    if (ttr) {
      const dx = ttr.x - transform.x; const dy = ttr.y - transform.y
      const dist = Math.hypot(dx, dy)
      if (dist <= this.losRange && !rayBlockedSolids(transform.x, transform.y, ttr.x, ttr.y, this.rayStep, list, entityId)) {
        if (this.mode === 'fly') {
          const step = Math.min(this.chaseSpeed * dt, dist)
          transform.x += (dx / dist) * step; transform.y += (dy / dist) * step
        } else {
          transform.x += Math.sign(dx) * Math.min(this.chaseSpeed * dt, Math.abs(dx))
          if (this._spawnY != null) transform.y = this._spawnY
        }
        transform.scaleX = dx >= 0 ? 1 : -1
        transform.rotation = 0
        return
      }
    }
    if (this.mode === 'fly') {
      const p = Math.max(0.4, this.patrolPeriod)
      const t = time * ((Math.PI * 2) / p)
      transform.x = (this._spawnX ?? transform.x) + Math.cos(t) * this.ampX
      transform.y = this._spawnY ?? transform.y
      return
    }
    const minX = Math.min(this.patrolMinX, this.patrolMaxX)
    const maxX = Math.max(this.patrolMinX, this.patrolMaxX)
    let vx = this._dir * this.patrolSpeed
    const nextByPatrol = transform.x + vx * dt
    if (nextByPatrol <= minX) { this._dir = 1; vx = Math.abs(vx) } else if (nextByPatrol >= maxX) { this._dir = -1; vx = -Math.abs(vx) }
    const self = list.find(c => c.entityId === entityId)
    if (self) {
      const hw = (self.right - self.left) / 2
      const hh = (self.bottom - self.top) / 2

      const prevX = transform.x
      let nextX = transform.x + vx * dt
      for (const c of list) {
        if (c.entityId === entityId || c.kind !== 'solid') continue
        const top = transform.y - hh
        const bottom = transform.y + hh
        if (bottom <= c.top || top >= c.bottom) continue
        const prevLeft = prevX - hw
        const prevRight = prevX + hw
        const nextLeft = nextX - hw
        const nextRight = nextX + hw
        if (vx > 0 && prevRight <= c.left && nextRight >= c.left) {
          nextX = c.left - hw
          this._dir = -1
          vx = -Math.abs(vx)
        } else if (vx < 0 && prevLeft >= c.right && nextLeft <= c.right) {
          nextX = c.right + hw
          this._dir = 1
          vx = Math.abs(vx)
        }
      }
      transform.x = nextX

      const prevY = transform.y
      this._vy = Math.min(this.maxFallSpeed, this._vy + this.gravity * dt)
      let nextY = transform.y + this._vy * dt
      const prevFeet = prevY + hh
      const nextFeet = nextY + hh
      for (const c of list) {
        if (c.entityId === entityId) continue
        const active = c.kind === 'solid' || (c.kind === 'jumpThru' && this._vy > 0)
        if (!active) continue
        const left = transform.x - hw
        const right = transform.x + hw
        if (right <= c.left || left >= c.right) continue
        if (this._vy >= 0 && prevFeet <= c.top + 2 && nextFeet >= c.top - 1) {
          nextY = c.top - hh
          this._vy = 0
          break
        }
      }
      transform.y = nextY
    } else {
      transform.x += vx * dt
      this._vy = Math.min(this.maxFallSpeed, this._vy + this.gravity * dt)
      transform.y += this._vy * dt
    }
    transform.scaleX = vx >= 0 ? 1 : -1
    transform.rotation = 0
  }
}

function rayBlockedSolids (x0: number, y0: number, x1: number, y1: number, step: number, colliders: ColliderAabb[], selfId: number): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0)
  const n = Math.max(1, Math.ceil(d / Math.max(step, 1)))
  for (let i = 1; i < n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    for (const c of colliders) {
      if (c.entityId === selfId || c.kind !== 'solid') continue
      if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) return true
    }
  }
  return false
}
