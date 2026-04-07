import { BaseBehavior } from './BaseBehavior.js'
import { COMPONENT_TRANSFORM } from '../Components/index.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import type { ColliderAabb } from '../Core/CollisionService.js'
import { lineOfSightBehaviorDefaults } from './Config/lineOfSightBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

/**
 * Line-of-sight sensing behavior for AI decision systems.
 *
 * Evaluates range, cone-of-view, and obstacle blocking, then emits
 * `lineOfSight:changed` when visibility to target toggles.
 */
export class LineOfSightBehavior extends BaseBehavior {
  static type = 'lineOfSight'
  static priority = 35
  static defaultProperties = { ...lineOfSightBehaviorDefaults }

  targetName = ''
  range = 500
  rayStep = 8
  coneOfView = 360
  obstacles: 'solids' | 'custom' = 'solids'
  customObstacleNames: string[] = []
  private _hadLos: boolean | null = null
  private _customObstacleSet = new Set<string>()

  constructor (json: JsonRecord = {}) {
    super(json)
    this._syncCustomObstacleSet()
  }

  private _syncCustomObstacleSet (): void {
    this._customObstacleSet = new Set((Array.isArray(this.customObstacleNames) ? this.customObstacleNames : []).map(String))
  }

  /**
   * Applies LOS target/range/cone/obstacle settings from JSON.
   *
   * @param {JsonRecord} json Raw behavior config.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.targetName != null) this.targetName = String(json.targetName)
    if (json.range != null) this.range = Number(json.range)
    if (json.rayStep != null) this.rayStep = Number(json.rayStep)
    if (json.coneOfView != null) this.coneOfView = Number(json.coneOfView)
    if (json.obstacles != null) this.obstacles = String(json.obstacles).toLowerCase() === 'custom' ? 'custom' : 'solids'
    if (Array.isArray(json.customObstacleNames)) this.customObstacleNames = json.customObstacleNames.map(String)
    this._syncCustomObstacleSet()
  }

  /**
   * Evaluates current line-of-sight and emits change events.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled() || !this.targetName) return
    const { transform, world, events, entityId, colliders } = ctx
    const tid = world?.findEntityIdByMetaName(this.targetName)
    let has = false
    if (tid != null && world) {
      const ttr = world.getComponent(tid, COMPONENT_TRANSFORM) as { x: number; y: number } | undefined
      if (ttr) {
        const dx = ttr.x - transform.x
        const dy = ttr.y - transform.y
        const d = Math.hypot(dx, dy)
        if (d <= this.range && d > 0.001) {
          const inCone = this.coneOfView >= 360 || inConeOfView(transform.x, transform.y, transform.rotation, ttr.x, ttr.y, this.coneOfView)
          if (inCone) has = !rayBlocked(transform.x, transform.y, ttr.x, ttr.y, this.rayStep, colliders ?? [], entityId, world, this.obstacles, this._customObstacleSet)
        }
      }
    }
    if (has !== this._hadLos) {
      this._hadLos = has
      events?.emit('lineOfSight:changed', { entityId, hasLos: has, targetName: this.targetName })
    }
  }
}

/**
 * Tests whether a target lies inside a forward-facing cone.
 *
 * @param {number} ax Observer x.
 * @param {number} ay Observer y.
 * @param {number} forwardRad Observer forward angle (radians).
 * @param {number} tx Target x.
 * @param {number} ty Target y.
 * @param {number} coneDeg Full cone angle in degrees.
 * @returns {boolean} True when target is within cone.
 */
function inConeOfView (ax: number, ay: number, forwardRad: number, tx: number, ty: number, coneDeg: number): boolean {
  const half = ((coneDeg / 2) * Math.PI) / 180
  const fx = Math.cos(forwardRad); const fy = Math.sin(forwardRad)
  const vx = tx - ax; const vy = ty - ay
  const len = Math.hypot(vx, vy)
  if (len < 1e-6) return true
  const dot = Math.max(-1, Math.min(1, fx * (vx / len) + fy * (vy / len)))
  return Math.acos(dot) <= half + 1e-5
}

/**
 * Ray-samples obstacle colliders between two points.
 *
 * @param {number} x0 Start x.
 * @param {number} y0 Start y.
 * @param {number} x1 End x.
 * @param {number} y1 End y.
 * @param {number} step Sample interval.
 * @param {ColliderAabb[]} colliders Collider list.
 * @param {number} selfId Entity id to ignore.
 * @param {BehaviorRuntimeContext['world']} world World reference.
 * @param {'solids' | 'custom'} mode Obstacle mode.
 * @param {Set<string>} customSet Custom blocker names.
 * @returns {boolean} `true` when blocked.
 */
function rayBlocked (
  x0: number, y0: number, x1: number, y1: number, step: number, colliders: ColliderAabb[], selfId: number,
  world: BehaviorRuntimeContext['world'], mode: 'solids' | 'custom', customSet: Set<string>
): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0)
  const n = Math.max(1, Math.ceil(d / Math.max(step, 1)))
  for (let i = 1; i < n; i++) {
    const t = i / n
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    for (const c of colliders) {
      if (c.entityId === selfId) continue
      if (!(mode === 'solids' ? c.kind === 'solid' : (world.getMetaName(c.entityId) != null && customSet.has(String(world.getMetaName(c.entityId)))))) continue
      if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) return true
    }
  }
  return false
}
