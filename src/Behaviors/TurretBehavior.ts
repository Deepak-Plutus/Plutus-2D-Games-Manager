import { BaseBehavior } from './BaseBehavior.js'
import { COMPONENT_META, COMPONENT_TRANSFORM } from '../Components/index.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { turretBehaviorDefaults } from './Config/turretBehaviorConfig.js'

const DEG = Math.PI / 180

export class TurretBehavior extends BaseBehavior {
  static type = 'turret'
  static priority = 32
  static defaultProperties = { ...turretBehaviorDefaults }

  range = 400
  rateOfFire = 2
  rotate = true
  rotateSpeed = 180
  targetMode = 'first'
  predictiveAim = false
  projectileSpeed = 400
  useCollisionCells = true
  targetNames: string[] = []
  aimToleranceDeg = 6
  private _targetNames = new Set<string>()
  private _currentTargetId: number | null = null
  private _fireCooldown = 0

  applyJsonProperties (json: Record<string, unknown>): void {
    if (json.range != null) this.range = Number(json.range)
    if (json.rateOfFire != null) this.rateOfFire = Number(json.rateOfFire)
    if (json.rotate != null) this.rotate = !!json.rotate
    if (json.rotateSpeed != null) this.rotateSpeed = Number(json.rotateSpeed)
    if (json.targetMode != null) this.targetMode = String(json.targetMode).toLowerCase()
    if (json.aimToleranceDeg != null) this.aimToleranceDeg = Number(json.aimToleranceDeg)
    if (Array.isArray(json.targetNames)) for (const n of json.targetNames) this._targetNames.add(String(n))
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled() || !ctx.world) return
    const { world, transform, dt, entityId, events } = ctx
    const candidates: Array<{ id: number; d: number }> = []
    for (const e of world.entities.values()) {
      if (e.id === entityId) continue
      const meta = world.getComponent(e.id, COMPONENT_META) as { name?: string } | undefined
      const n = meta?.name != null ? String(meta.name) : null
      if (!n || !this._targetNames.has(n)) continue
      const tr = world.getComponent(e.id, COMPONENT_TRANSFORM) as { x: number; y: number } | undefined
      if (!tr) continue
      const d = Math.hypot(tr.x - transform.x, tr.y - transform.y)
      if (d <= this.range) candidates.push({ id: e.id, d })
    }
    if (candidates.length === 0) { this._currentTargetId = null; this._fireCooldown = 0; return }
    if (this.targetMode === 'nearest') candidates.sort((a, b) => a.d - b.d)
    if (this._currentTargetId == null) this._currentTargetId = candidates[0]?.id ?? null
    if (this._currentTargetId == null) return
    const ttr = world.getComponent(this._currentTargetId, COMPONENT_TRANSFORM) as { x: number; y: number } | undefined
    if (!ttr) { this._currentTargetId = null; return }
    const wantAngle = Math.atan2(ttr.y - transform.y, ttr.x - transform.x)
    if (this.rotate) transform.rotation = rotateToward(transform.rotation, wantAngle, this.rotateSpeed * DEG * dt)
    const aimed = !this.rotate || Math.abs(angleDelta(transform.rotation, wantAngle)) <= this.aimToleranceDeg * DEG
    if (!aimed || this.rateOfFire <= 0) { this._fireCooldown = 0; return }
    this._fireCooldown -= dt
    if (this._fireCooldown <= 0) {
      this._fireCooldown = 1 / this.rateOfFire
      events?.emit('turret:shoot', { entityId, targetId: this._currentTargetId, angle: transform.rotation })
    }
  }
}

function angleDelta (a: number, b: number): number { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d }
function rotateToward (current: number, target: number, maxStep: number): number { const d = angleDelta(current, target); return Math.abs(d) <= maxStep ? target : current + Math.sign(d) * maxStep }
