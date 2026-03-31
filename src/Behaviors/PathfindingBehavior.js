import { BaseBehavior } from './BaseBehavior.js';
import { pathfindingBehaviorDefaults } from './Config/pathfindingBehaviorConfig.js';

/**
 * Grid A* pathfinding around solid colliders (Construct-style).
 *
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/pathfinding
 */
export class PathfindingBehavior extends BaseBehavior {
  static type = 'pathfinding';
  static priority = 17;

  static defaultProperties = { ...pathfindingBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private @type {{ x: number, y: number }[]} */
    this._waypoints = [];
    /** @private */
    this._wpIndex = 0;
    /** @private */
    this._moving = false;
    /** @private */
    this._foundPath = false;
    /** @private */
    this._lastNodeCount = 0;
    /** @private */
    this._goalX = 0;
    /** @private */
    this._goalY = 0;
    /** @private */
    this._pendingFind = false;
  }

  applyJsonProperties(json) {
    if (json.cellSize != null) this.cellSize = Number(json.cellSize);
    if (json.maxCellsWidth != null) this.maxCellsWidth = Number(json.maxCellsWidth);
    if (json.maxCellsHeight != null) this.maxCellsHeight = Number(json.maxCellsHeight);
    if (json.speed != null) this.speed = Number(json.speed);
    if (json.rotateToWaypoint != null) this.rotateToWaypoint = !!json.rotateToWaypoint;
    if (json.directions != null) this.directions = Number(json.directions);
    if (json.waypointArriveDistance != null)
      this.waypointArriveDistance = Number(json.waypointArriveDistance);
    if (json.obstaclesSolids != null) this.obstaclesSolids = !!json.obstaclesSolids;
  }

  /**
   * @param {number} layoutX
   * @param {number} layoutY
   * @param {import('../Core/CollisionService.js').ColliderAabb[]} colliders
   * @param {number} entityId
   * @param {number} layoutWidth
   * @param {number} layoutHeight
   */
  findPath(layoutX, layoutY, colliders, entityId, layoutWidth, layoutHeight) {
    const cell = Math.max(4, this.cellSize);
    const cols = Math.min(this.maxCellsWidth, Math.ceil(layoutWidth / cell));
    const rows = Math.min(this.maxCellsHeight, Math.ceil(layoutHeight / cell));
    const grid = buildSolidGrid(cols, rows, cell, colliders, entityId, this.obstaclesSolids);

    const sx = Math.min(cols - 1, Math.max(0, Math.floor(layoutX / cell)));
    const sy = Math.min(rows - 1, Math.max(0, Math.floor(layoutY / cell)));
    const gx = Math.min(cols - 1, Math.max(0, Math.floor(this._goalX / cell)));
    const gy = Math.min(rows - 1, Math.max(0, Math.floor(this._goalY / cell)));

    const path = astar(grid, cols, rows, sx, sy, gx, gy, this.directions === 8);
    this._lastNodeCount = path.length;
    this._foundPath = path.length > 0;
    if (!this._foundPath) {
      this._waypoints = [];
      this._wpIndex = 0;
      this._moving = false;
      return false;
    }

    this._waypoints = path.map(([ix, iy]) => ({
      x: ix * cell + cell / 2,
      y: iy * cell + cell / 2,
    }));
    this._wpIndex = 0;
    return true;
  }

  /** @param {number} x @param {number} y layout coords */
  findPathTo(x, y) {
    this._goalX = Number(x);
    this._goalY = Number(y);
    this._pendingFind = true;
  }

  /** Alias for {@link findPathTo} */
  setDestination(x, y) {
    this.findPathTo(x, y);
  }

  get destinationX() {
    return this._goalX;
  }

  get destinationY() {
    return this._goalY;
  }

  setCellSize(s) {
    this.cellSize = Number(s);
  }

  setSpeed(s) {
    this.speed = Number(s);
  }

  setRotateToWaypoint(v) {
    this.rotateToWaypoint = !!v;
  }

  startMoving() {
    if (this._foundPath && this._waypoints.length) this._moving = true;
  }

  stop() {
    this._moving = false;
  }

  get isMoving() {
    return this._moving;
  }

  get foundPath() {
    return this._foundPath;
  }

  get nodeCount() {
    return this._lastNodeCount;
  }

  get currentNode() {
    return this._wpIndex;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, dt, colliders, entityId, layoutWidth, layoutHeight } = ctx;

    if (this._pendingFind) {
      this._pendingFind = false;
      this.findPath(transform.x, transform.y, colliders ?? [], entityId, layoutWidth, layoutHeight);
    }

    if (!this._moving || !this._waypoints.length) return;

    const target = this._waypoints[this._wpIndex];
    const dx = target.x - transform.x;
    const dy = target.y - transform.y;
    const d = Math.hypot(dx, dy);
    if (d <= this.waypointArriveDistance) {
      this._wpIndex++;
      if (this._wpIndex >= this._waypoints.length) {
        this._moving = false;
        this._waypoints = [];
        ctx.events?.emit('pathfinding:arrived', { entityId });
      }
      return;
    }

    const step = Math.min(this.speed * dt, d);
    transform.x += (dx / d) * step;
    transform.y += (dy / d) * step;
    if (this.rotateToWaypoint) transform.rotation = Math.atan2(dy, dx);
  }
}

/**
 * @param {import('../Core/CollisionService.js').ColliderAabb[]} colliders
 */
function buildSolidGrid(cols, rows, cellSize, colliders, selfId, useSolids) {
  const grid = new Uint8Array(cols * rows);
  if (!useSolids) return grid;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = i * cellSize + cellSize / 2;
      const cy = j * cellSize + cellSize / 2;
      for (const c of colliders) {
        if (c.entityId === selfId) continue;
        if (c.kind !== 'solid') continue;
        if (cx >= c.left && cx <= c.right && cy >= c.top && cy <= c.bottom) {
          grid[j * cols + i] = 1;
          break;
        }
      }
    }
  }
  return grid;
}

/**
 * @param {Uint8Array} grid
 * @returns {[number, number][]}
 */
function astar(grid, cols, rows, sx, sy, gx, gy, allowDiag) {
  if (sx < 0 || sy < 0 || gx < 0 || gy < 0 || sx >= cols || sy >= rows || gx >= cols || gy >= rows)
    return [];
  if (grid[sy * cols + sx] || grid[gy * cols + gx]) return [];

  const N = cols * rows;
  const inf = 1e15;
  const gScore = new Float64Array(N);
  const fScore = new Float64Array(N);
  const came = new Int32Array(N);
  gScore.fill(inf);
  fScore.fill(inf);
  came.fill(-1);

  const start = sy * cols + sx;
  const goal = gy * cols + gx;
  gScore[start] = 0;
  fScore[start] = heuristic(sx, sy, gx, gy);

  /** @type {number[]} */
  const open = [start];
  const inOpen = new Uint8Array(N);
  inOpen[start] = 1;

  const card = allowDiag
    ? [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]
    : [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

  while (open.length) {
    let bestI = 0;
    let bestF = fScore[open[0]];
    for (let k = 1; k < open.length; k++) {
      const fi = fScore[open[k]];
      if (fi < bestF) {
        bestF = fi;
        bestI = k;
      }
    }
    const current = open[bestI];
    open.splice(bestI, 1);
    inOpen[current] = 0;

    if (current === goal) {
      return reconstruct(came, cols, current);
    }

    const cx = current % cols;
    const cy = (current / cols) | 0;

    for (const [dx, dy] of card) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const ni = ny * cols + nx;
      if (grid[ni]) continue;
      const step = dx !== 0 && dy !== 0 ? 1.414 : 1;
      const tentative = gScore[current] + step;
      if (tentative < gScore[ni]) {
        came[ni] = current;
        gScore[ni] = tentative;
        fScore[ni] = tentative + heuristic(nx, ny, gx, gy);
        if (!inOpen[ni]) {
          open.push(ni);
          inOpen[ni] = 1;
        }
      }
    }
  }
  return [];
}

function heuristic(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/**
 * @param {Int32Array} came
 */
function reconstruct(came, cols, current) {
  /** @type {[number, number][]} */
  const path = [];
  let c = current;
  while (c >= 0) {
    path.push([c % cols, (c / cols) | 0]);
    c = came[c];
  }
  path.reverse();
  return path;
}
