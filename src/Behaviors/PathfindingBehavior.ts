import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import type { ColliderAabb } from '../Core/CollisionService.js'
import { pathfindingBehaviorDefaults } from './Config/pathfindingBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

export class PathfindingBehavior extends BaseBehavior {
  static type = 'pathfinding'
  static priority = 17
  static defaultProperties = { ...pathfindingBehaviorDefaults }

  cellSize = 32
  maxCellsWidth = 256
  maxCellsHeight = 256
  speed = 150
  rotateToWaypoint = false
  directions = 8
  waypointArriveDistance = 4
  obstaclesSolids = true
  private _waypoints: Array<{ x: number; y: number }> = []
  private _wpIndex = 0
  private _moving = false
  private _goalX = 0
  private _goalY = 0
  private _pendingFind = false

  applyJsonProperties (json: JsonRecord): void {
    if (json.cellSize != null) this.cellSize = Number(json.cellSize)
    if (json.maxCellsWidth != null) this.maxCellsWidth = Number(json.maxCellsWidth)
    if (json.maxCellsHeight != null) this.maxCellsHeight = Number(json.maxCellsHeight)
    if (json.speed != null) this.speed = Number(json.speed)
    if (json.rotateToWaypoint != null) this.rotateToWaypoint = !!json.rotateToWaypoint
    if (json.directions != null) this.directions = Number(json.directions)
    if (json.waypointArriveDistance != null) this.waypointArriveDistance = Number(json.waypointArriveDistance)
    if (json.obstaclesSolids != null) this.obstaclesSolids = !!json.obstaclesSolids
  }

  findPathTo (x: number, y: number): void {
    this._goalX = Number(x)
    this._goalY = Number(y)
    this._pendingFind = true
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, dt, colliders, entityId, layoutWidth, layoutHeight } = ctx
    if (this._pendingFind) {
      this._pendingFind = false
      this.findPath(transform.x, transform.y, colliders ?? [], entityId, layoutWidth, layoutHeight)
    }
    if (!this._moving || !this._waypoints.length) return
    const target = this._waypoints[this._wpIndex]
    if (!target) return
    const dx = target.x - transform.x
    const dy = target.y - transform.y
    const d = Math.hypot(dx, dy)
    if (d <= this.waypointArriveDistance) {
      this._wpIndex++
      if (this._wpIndex >= this._waypoints.length) {
        this._moving = false
        this._waypoints = []
        ctx.events?.emit('pathfinding:arrived', { entityId })
      }
      return
    }
    const step = Math.min(this.speed * dt, d)
    transform.x += (dx / d) * step
    transform.y += (dy / d) * step
    if (this.rotateToWaypoint) transform.rotation = Math.atan2(dy, dx)
  }

  private findPath (layoutX: number, layoutY: number, colliders: ColliderAabb[], entityId: number, layoutWidth: number, layoutHeight: number): boolean {
    const cell = Math.max(4, this.cellSize)
    const cols = Math.min(this.maxCellsWidth, Math.ceil(layoutWidth / cell))
    const rows = Math.min(this.maxCellsHeight, Math.ceil(layoutHeight / cell))
    const grid = buildSolidGrid(cols, rows, cell, colliders, entityId, this.obstaclesSolids)
    const sx = Math.min(cols - 1, Math.max(0, Math.floor(layoutX / cell)))
    const sy = Math.min(rows - 1, Math.max(0, Math.floor(layoutY / cell)))
    const gx = Math.min(cols - 1, Math.max(0, Math.floor(this._goalX / cell)))
    const gy = Math.min(rows - 1, Math.max(0, Math.floor(this._goalY / cell)))
    const path = astar(grid, cols, rows, sx, sy, gx, gy, this.directions === 8)
    if (!path.length) { this._waypoints = []; this._wpIndex = 0; this._moving = false; return false }
    this._waypoints = path.map(([ix, iy]) => ({ x: ix * cell + cell / 2, y: iy * cell + cell / 2 }))
    this._wpIndex = 0
    this._moving = true
    return true
  }
}

function buildSolidGrid (cols: number, rows: number, cellSize: number, colliders: ColliderAabb[], selfId: number, useSolids: boolean): Uint8Array {
  const grid = new Uint8Array(cols * rows)
  if (!useSolids) return grid
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = i * cellSize + cellSize / 2
      const cy = j * cellSize + cellSize / 2
      for (const c of colliders) {
        if (c.entityId === selfId || c.kind !== 'solid') continue
        if (cx >= c.left && cx <= c.right && cy >= c.top && cy <= c.bottom) { grid[j * cols + i] = 1; break }
      }
    }
  }
  return grid
}

function astar (grid: Uint8Array, cols: number, rows: number, sx: number, sy: number, gx: number, gy: number, allowDiag: boolean): [number, number][] {
  if (sx < 0 || sy < 0 || gx < 0 || gy < 0 || sx >= cols || sy >= rows || gx >= cols || gy >= rows) return []
  if (grid[sy * cols + sx] || grid[gy * cols + gx]) return []
  const N = cols * rows
  const inf = 1e15
  const gScore = new Float64Array(N); gScore.fill(inf)
  const fScore = new Float64Array(N); fScore.fill(inf)
  const came = new Int32Array(N); came.fill(-1)
  const start = sy * cols + sx
  const goal = gy * cols + gx
  gScore[start] = 0
  fScore[start] = Math.abs(sx - gx) + Math.abs(sy - gy)
  const open: number[] = [start]
  const inOpen = new Uint8Array(N); inOpen[start] = 1
  const dirs: Array<[number, number]> = allowDiag
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]]
  while (open.length) {
    const firstOpen = open[0]
    if (firstOpen == null) break
    let bi = 0; let bf = fScore[firstOpen] ?? Number.POSITIVE_INFINITY
    for (let k = 1; k < open.length; k++) {
      const ok = open[k]
      if (ok == null) continue
      const fi = fScore[ok] ?? Number.POSITIVE_INFINITY
      if (fi < bf) { bf = fi; bi = k }
    }
    const current = open[bi]
    if (current == null) break
    open.splice(bi, 1); inOpen[current] = 0
    if (current === goal) return reconstruct(came, cols, current)
    const cx = current % cols; const cy = (current / cols) | 0
    for (const [dx, dy] of dirs) {
      const nx = cx + dx; const ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
      const ni = ny * cols + nx
      if (grid[ni]) continue
      const tentative = (gScore[current] ?? Number.POSITIVE_INFINITY) + (dx !== 0 && dy !== 0 ? 1.414 : 1)
      if (tentative < (gScore[ni] ?? Number.POSITIVE_INFINITY)) {
        came[ni] = current
        gScore[ni] = tentative
        fScore[ni] = tentative + Math.abs(nx - gx) + Math.abs(ny - gy)
        if (!inOpen[ni]) { open.push(ni); inOpen[ni] = 1 }
      }
    }
  }
  return []
}

function reconstruct (came: Int32Array, cols: number, current: number): [number, number][] {
  const path: [number, number][] = []
  let c = current
  while (c >= 0) {
    path.push([c % cols, (c / cols) | 0])
    const next = came[c]
    if (next == null) break
    c = next
  }
  path.reverse()
  return path
}
