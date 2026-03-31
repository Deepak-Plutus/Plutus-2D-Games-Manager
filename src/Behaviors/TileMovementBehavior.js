import { BaseBehavior } from './BaseBehavior.js';
import { tileMovementBehaviorDefaults } from './Config/tileMovementBehaviorConfig.js';
import { isAnyKeyDown } from './KeyBindings.js';

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/tile-movement
 */
export class TileMovementBehavior extends BaseBehavior {
  static type = 'tileMovement';
  static priority = 16;

  static defaultProperties = { ...tileMovementBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private */
    this._simDir = '';
    /** @private */
    this._fromX = 0;
    /** @private */
    this._fromY = 0;
    /** @private */
    this._toX = 0;
    /** @private */
    this._toY = 0;
    /** @private */
    this._t = 0;
    /** @private */
    this._moving = false;
  }

  applyJsonProperties(json) {
    if (json.gridSize != null) this.gridSize = Number(json.gridSize);
    if (json.moveDuration != null) this.moveDuration = Number(json.moveDuration);
    if (json.isometric != null) this.isometric = !!json.isometric;
    if (json.directions != null) this.directions = Number(json.directions);
    if (json.defaultControls != null) this.defaultControls = !!json.defaultControls;
    if (json.keyBindings != null && typeof json.keyBindings === 'object') {
      this.updateKeyBindings(/** @type {Record<string, unknown>} */ (json.keyBindings));
    }
  }

  updateKeyBindings(partial) {
    if (!partial || typeof partial !== 'object') return;
    for (const [action, codes] of Object.entries(partial)) {
      if (!Array.isArray(codes)) continue;
      this.keyBindings[action] = codes.map((c) => String(c));
    }
  }

  get isMoving() {
    return this._moving;
  }

  get gridX() {
    return Math.round(this._lastGX ?? 0);
  }

  get gridY() {
    return Math.round(this._lastGY ?? 0);
  }

  /** Snap transform to nearest grid center */
  snapToGrid(transform) {
    const g = Math.max(1, this.gridSize);
    transform.x = Math.round(transform.x / g) * g;
    transform.y = Math.round(transform.y / g) * g;
    this._syncGridIndices(transform);
  }

  _syncGridIndices(transform) {
    const g = Math.max(1, this.gridSize);
    this._lastGX = transform.x / g;
    this._lastGY = transform.y / g;
  }

  moveInDirection(dx, dy, transform) {
    if (this._moving) return;
    const g = Math.max(1, this.gridSize);
    this._fromX = transform.x;
    this._fromY = transform.y;
    let nx = dx;
    let ny = dy;
    if (this.isometric) {
      nx = (dx - dy) * (g / 2);
      ny = ((dx + dy) * g) / 4;
    } else {
      nx *= g;
      ny *= g;
    }
    this._toX = this._fromX + nx;
    this._toY = this._fromY + ny;
    this._t = 0;
    this._moving = true;
  }

  simulateControl(control) {
    const c = String(control).toLowerCase().trim();
    this._simDir = c;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, dt, input } = ctx;
    const g = Math.max(1, this.gridSize);

    if (this._lastGX === undefined) this._syncGridIndices(transform);

    if (this._moving) {
      const dur = Math.max(1e-6, this.moveDuration);
      this._t += dt / dur;
      if (this._t >= 1) {
        transform.x = this._toX;
        transform.y = this._toY;
        this._moving = false;
        this._t = 0;
      } else {
        const e = easeOutQuad(this._t);
        transform.x = this._fromX + (this._toX - this._fromX) * e;
        transform.y = this._fromY + (this._toY - this._fromY) * e;
      }
      this._syncGridIndices(transform);
      return;
    }

    let dx = 0;
    let dy = 0;
    const sim = this._simDir;
    this._simDir = '';
    if (sim === 'left') dx = -1;
    else if (sim === 'right') dx = 1;
    else if (sim === 'up') dy = -1;
    else if (sim === 'down') dy = 1;

    if (this.defaultControls && input) {
      if (isAnyKeyDown(input, this.keyBindings.left)) dx -= 1;
      if (isAnyKeyDown(input, this.keyBindings.right)) dx += 1;
      if (isAnyKeyDown(input, this.keyBindings.up)) dy -= 1;
      if (isAnyKeyDown(input, this.keyBindings.down)) dy += 1;
    }

    if (this.directions === 4) {
      if (dx !== 0 && dy !== 0) {
        if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
        else dx = 0;
      }
    }

    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));
    if (dx !== 0 || dy !== 0) this.moveInDirection(dx, dy, transform);
  }
}

function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}
