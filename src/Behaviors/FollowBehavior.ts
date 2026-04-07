import { BaseBehavior } from './BaseBehavior.js'
import { COMPONENT_DISPLAY, COMPONENT_TRANSFORM } from '../Components/index.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { followBehaviorDefaults } from './Config/followBehaviorConfig.js'

type FollowSample = {
  t: number; x: number; y: number; rotation: number; width: number; height: number; alpha: number; visible: boolean
}
type JsonRecord = Record<string, unknown>

export class FollowBehavior extends BaseBehavior {
  static type = 'follow'
  static priority = 22
  static defaultProperties = { ...followBehaviorDefaults }

  targetName = ''
  historyRate = 30
  historyMaxEntries = 10
  followDelay = 0.15
  maxSpeed = 200
  stopDistance = 4
  rotateToward = false
  followSelf = false
  following = true
  followX = true
  followY = true
  followWidth = false
  followHeight = false
  followAngle = false
  followOpacity = false
  followVisibility = false
  followDestroyed = false
  private _entries: FollowSample[] = []
  private _histAcc = 0

  applyJsonProperties (json: JsonRecord): void {
    Object.assign(this, {
      targetName: json.targetName != null ? String(json.targetName) : this.targetName,
      historyRate: json.historyRate != null ? Number(json.historyRate) : this.historyRate,
      historyMaxEntries: json.historyMaxEntries != null ? Number(json.historyMaxEntries) : this.historyMaxEntries,
      followDelay: json.followDelay != null ? Number(json.followDelay) : this.followDelay,
      maxSpeed: json.maxSpeed != null ? Number(json.maxSpeed) : this.maxSpeed,
      stopDistance: json.stopDistance != null ? Number(json.stopDistance) : this.stopDistance
    })
    if (json.rotateToward != null) this.rotateToward = !!json.rotateToward
    if (json.followSelf != null) this.followSelf = !!json.followSelf
    if (json.following != null) this.following = !!json.following
    if (json.followX != null) this.followX = !!json.followX
    if (json.followY != null) this.followY = !!json.followY
    if (json.followWidth != null) this.followWidth = !!json.followWidth
    if (json.followHeight != null) this.followHeight = !!json.followHeight
    if (json.followAngle != null) this.followAngle = !!json.followAngle
    if (json.followOpacity != null) this.followOpacity = !!json.followOpacity
    if (json.followVisibility != null) this.followVisibility = !!json.followVisibility
    if (json.followDestroyed != null) this.followDestroyed = !!json.followDestroyed
    this.historyMaxEntries = Math.min(10, Math.max(1, Math.floor(Number(this.historyMaxEntries)) || 10))
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled() || !this.following) return
    const { transform, world, dt, entityId, displayView, time: gameTime = 0 } = ctx
    if (!world) return
    const sourceId = this.followSelf ? entityId : world.findEntityIdByMetaName(this.targetName)
    if (sourceId == null) {
      if (this.followDestroyed && !this.followSelf) world.destroyEntity(entityId)
      return
    }
    const interval = 1 / Math.max(this.historyRate, 0.001)
    this._histAcc += dt
    if (this._histAcc >= interval) {
      this._histAcc -= interval
      const snap = captureSnapshot(sourceId, world, gameTime)
      if (snap) this._pushEntry(snap)
    }
    const sample = sampleHistory(this._entries, gameTime - Math.max(0, this.followDelay))
    if (!sample) return
    if (this.followX || this.followY) {
      const tx = this.followX ? sample.x : transform.x
      const ty = this.followY ? sample.y : transform.y
      const dx = tx - transform.x
      const dy = ty - transform.y
      const dist = Math.hypot(dx, dy)
      if (dist > this.stopDistance) {
        if (this.maxSpeed > 0 && dist > 0.001) {
          const step = Math.min(this.maxSpeed * dt, dist)
          transform.x += (dx / dist) * step
          transform.y += (dy / dist) * step
        } else {
          if (this.followX) transform.x = tx
          if (this.followY) transform.y = ty
        }
      }
      if (this.rotateToward) {
        const rdx = tx - transform.x
        const rdy = ty - transform.y
        if (Math.hypot(rdx, rdy) > 0.02) transform.rotation = Math.atan2(rdy, rdx)
      }
    }
    if (this.followAngle) transform.rotation = lerpAngleRad(transform.rotation, sample.rotation, this.maxSpeed > 0 ? Math.min(1, (this.maxSpeed * dt) / 120) : 1)
    if (displayView) {
      const v = displayView as { width: number; height: number; alpha?: number; visible?: boolean }
      if (this.followWidth) v.width = this.maxSpeed > 0 ? moveToward(v.width, sample.width, this.maxSpeed * dt) : sample.width
      if (this.followHeight) v.height = this.maxSpeed > 0 ? moveToward(v.height, sample.height, this.maxSpeed * dt) : sample.height
      if (this.followOpacity) {
        const a = v.alpha ?? 1
        v.alpha = this.maxSpeed > 0 ? moveToward(a, sample.alpha, this.maxSpeed * dt * 0.01) : sample.alpha
      }
      if (this.followVisibility) v.visible = sample.visible
    }
  }

  private _pushEntry (s: FollowSample): void {
    this._entries.push(s)
    const cap = Math.min(10, Math.max(1, Math.floor(this.historyMaxEntries) || 10))
    while (this._entries.length > cap) this._entries.shift()
  }
}

function captureSnapshot (eid: number, world: BehaviorRuntimeContext['world'], t: number): FollowSample | null {
  const tr = world.getComponent(eid, COMPONENT_TRANSFORM) as { x: number; y: number; rotation: number } | undefined
  if (!tr) return null
  const disp = world.getComponent(eid, COMPONENT_DISPLAY) as { view?: { width: number; height: number; alpha?: number; visible?: boolean } } | undefined
  const v = disp?.view
  return { t, x: tr.x, y: tr.y, rotation: tr.rotation, width: v?.width ?? 0, height: v?.height ?? 0, alpha: v?.alpha ?? 1, visible: v?.visible !== false }
}

function sampleHistory (entries: FollowSample[], targetT: number): FollowSample | null {
  if (entries.length === 0) return null
  const first = entries[0]
  if (!first) return null
  if (targetT <= first.t) return first
  const last = entries[entries.length - 1]
  if (!last) return null
  if (targetT >= last.t) return last
  for (let i = 0; i < entries.length - 1; i++) {
    const a = entries[i]
    const b = entries[i + 1]
    if (!a || !b) continue
    if (targetT >= a.t && targetT <= b.t) {
      const u = (targetT - a.t) / (b.t - a.t || 1e-9)
      return { t: a.t + (b.t - a.t) * u, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, rotation: lerpAngleRad(a.rotation, b.rotation, u), width: a.width + (b.width - a.width) * u, height: a.height + (b.height - a.height) * u, alpha: a.alpha + (b.alpha - a.alpha) * u, visible: u < 0.5 ? a.visible : b.visible }
    }
  }
  return last
}

function lerpAngleRad (a: number, b: number, t: number): number {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return a + d * t
}
function moveToward (current: number, target: number, maxStep: number): number {
  const d = target - current
  if (Math.abs(d) <= maxStep) return target
  return current + Math.sign(d) * maxStep
}
