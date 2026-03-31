/**
 * Normalized pointer state relative to the game canvas (logical app pixels).
 * Mouse + touch unified via Pointer Events; optional {@link InputEventHub} emission.
 */
export class PointerInput {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.isDown = false;
    this.button = -1;
    /** Merged virtual / gamepad stick (-1..1), for action mapping */
    this.stickX = 0;
    this.stickY = 0;
    /** @type {HTMLCanvasElement | null} */
    this._canvas = null;
    this._w = 800;
    this._h = 600;
    /** @type {import('./InputEventHub.js').InputEventHub | null} */
    this._hub = null;
    this._down = this._onPointerDown.bind(this);
    this._up = this._onPointerUp.bind(this);
    this._move = this._onPointerMove.bind(this);
    this._leave = this._onPointerLeave.bind(this);
    /** @private */
    this._activePointerId = 0;
    /** @private */
    this._pointerType = 'mouse';
  }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {number} layoutWidth
   * @param {number} layoutHeight
   */
  attach(canvas, layoutWidth, layoutHeight) {
    this.detach();
    this._canvas = canvas;
    this._w = layoutWidth;
    this._h = layoutHeight;
    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointerleave', this._leave);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
    window.addEventListener('pointermove', this._move);
  }

  detach() {
    if (!this._canvas) return;
    this._canvas.removeEventListener('pointerdown', this._down);
    this._canvas.removeEventListener('pointerleave', this._leave);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
    window.removeEventListener('pointermove', this._move);
    this._canvas = null;
    this.isDown = false;
  }

  setLayoutSize(w, h) {
    this._w = w;
    this._h = h;
  }

  /**
   * @param {import('./InputEventHub.js').InputEventHub | null} hub
   */
  setInputEventHub(hub) {
    this._hub = hub;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  setStickFromGamepad(x, y) {
    this.stickX = x;
    this.stickY = y;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{ x: number, y: number }}
   */
  clientToLayout(clientX, clientY) {
    return this._toLocalCoords(clientX, clientY);
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   */
  _toLocalCoords(clientX, clientY) {
    if (!this._canvas) return { x: 0, y: 0 };
    const r = this._canvas.getBoundingClientRect();
    const nx = (clientX - r.left) / Math.max(r.width, 1);
    const ny = (clientY - r.top) / Math.max(r.height, 1);
    return { x: nx * this._w, y: ny * this._h };
  }

  /**
   * @param {PointerEvent} e
   */
  _emitPointer(type, e, extra = {}) {
    const p = this._toLocalCoords(e.clientX, e.clientY);
    this._hub?.emit(type, {
      x: p.x,
      y: p.y,
      clientX: e.clientX,
      clientY: e.clientY,
      button: e.button,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      pressure: e.pressure,
      ...extra,
    });
  }

  /**
   * @param {PointerEvent} e
   */
  _onPointerDown(e) {
    if (!this._canvas || e.target !== this._canvas) return;
    this.isDown = true;
    this.button = e.button;
    this._activePointerId = e.pointerId;
    this._pointerType = e.pointerType;
    const p = this._toLocalCoords(e.clientX, e.clientY);
    this.x = p.x;
    this.y = p.y;
    this._emitPointer('pointer:down', e);
    this._hub?.emit('pointer:tap:start', {
      x: p.x,
      y: p.y,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
    });
  }

  /**
   * @param {PointerEvent} e
   */
  _onPointerUp(e) {
    if (!this.isDown || e.pointerId !== this._activePointerId) return;
    this._emitPointer('pointer:up', e);
    this._hub?.emit('pointer:tap:end', {
      x: this.x,
      y: this.y,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
    });
    this.isDown = false;
    this.button = -1;
  }

  /**
   * @param {PointerEvent} e
   */
  _onPointerMove(e) {
    const p = this._toLocalCoords(e.clientX, e.clientY);
    this.x = p.x;
    this.y = p.y;
    this._emitPointer('pointer:move', e);
  }

  /**
   * @param {PointerEvent} e
   */
  _onPointerLeave(e) {
    this._emitPointer('pointer:leave', e);
  }
}
