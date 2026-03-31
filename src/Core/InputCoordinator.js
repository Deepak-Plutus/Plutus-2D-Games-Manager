import { InputActionMap } from './InputActionMap.js';

/**
 * Wires DOM → {@link InputEventHub}, global drag + wheel + gamepad polling,
 * virtual joystick state, and {@link InputActionMap} resolution.
 */
export class InputCoordinator {
  /**
   * @param {import('./InputEventHub.js').InputEventHub} hub
   * @param {import('./KeyboardInput.js').KeyboardInput} keyboard
   * @param {import('./PointerInput.js').PointerInput} pointer
   */
  constructor(hub, keyboard, pointer) {
    this.hub = hub;
    this.keyboard = keyboard;
    this.pointer = pointer;
    /** @type {InputActionMap} */
    this.actions = new InputActionMap();
    /** Virtual stick (-1..1), merged with gamepad in {@link update} */
    this.stick = { x: 0, y: 0 };
    /** @type {{ buttons: boolean[], axes: number[] } | null} */
    this._lastGamepad = null;
    /** @private */
    this._canvas = /** @type {HTMLCanvasElement | null} */ (null);
    /** @private */
    this._wheelHandler = (e) => this._onWheel(e);
    /** @private */
    this._dragThreshold = 4;
    /** @private */
    this._dragActive = false;
    /** @private */
    this._dragStarted = false;
    /** @private */
    this._dragStartX = 0;
    /** @private */
    this._dragStartY = 0;
    /** @private */
    this._dragPointerId = -1;
    /** @private */
    this._req = { keyboard: false, pointer: false, wheel: false, gamepad: false };
    /** @private */
    this._gamepadEnabled = false;
    /** @private @type {(() => void)[]} */
    this._unsubs = [];
    /** @private */
    this._drDown = (ev) => this._onDragPointerDown(/** @type {CustomEvent} */ (ev).detail);
    /** @private */
    this._drMove = (ev) => this._onDragPointerMove(/** @type {CustomEvent} */ (ev).detail);
    /** @private */
    this._drUp = (ev) => this._onDragPointerUp(/** @type {CustomEvent} */ (ev).detail);
  }

  /**
   * @param {HTMLCanvasElement | null} canvas
   * @param {number} layoutW
   * @param {number} layoutH
   * @param {Record<string, unknown>} [inputConfig]
   * @param {{ keyboard?: boolean, pointer?: boolean, wheel?: boolean, gamepad?: boolean }} requirements
   */
  configure(canvas, layoutW, layoutH, inputConfig = {}, requirements = {}) {
    this.dispose();
    this._canvas = canvas;
    this.actions = InputActionMap.fromConfig(inputConfig);
    this._dragThreshold =
      inputConfig.dragThreshold != null ? Number(inputConfig.dragThreshold) : 4;
    this._gamepadEnabled =
      !!requirements.gamepad ||
      !!(/** @type {Record<string, unknown>} */ (inputConfig.gamepad ?? {})).enabled;

    this._req = {
      keyboard: !!requirements.keyboard,
      pointer: !!requirements.pointer,
      wheel: !!requirements.wheel || !!(/** @type {Record<string, unknown>} */ (inputConfig.wheel ?? {})).enabled,
      gamepad: this._gamepadEnabled,
    };

    if (this._req.wheel && canvas) {
      canvas.addEventListener('wheel', this._wheelHandler, { passive: true });
    }

    this.keyboard.setInputEventHub(this._req.keyboard ? this.hub : null);
    this.pointer.setInputEventHub(this._req.pointer ? this.hub : null);

    if (this._req.pointer) {
      this.hub.addEventListener('pointer:down', this._drDown);
      this.hub.addEventListener('pointer:move', this._drMove);
      this.hub.addEventListener('pointer:up', this._drUp);
      this._unsubs.push(() => this.hub.removeEventListener('pointer:down', this._drDown));
      this._unsubs.push(() => this.hub.removeEventListener('pointer:move', this._drMove));
      this._unsubs.push(() => this.hub.removeEventListener('pointer:up', this._drUp));
    }
  }

  dispose() {
    this._canvas?.removeEventListener('wheel', this._wheelHandler);
    for (const u of this._unsubs) u();
    this._unsubs = [];
    this.keyboard.setInputEventHub(null);
    this.pointer.setInputEventHub(null);
  }

  /**
   * @param {WheelEvent} e
   */
  _onWheel(e) {
    const p = this.pointer.clientToLayout(e.clientX, e.clientY);
    this.hub.emit('wheel', {
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaMode: e.deltaMode,
      x: p.x,
      y: p.y,
    });
  }

  /**
   * @param {Record<string, unknown>} d
   */
  _onDragPointerDown(d) {
    this._dragActive = true;
    this._dragStarted = false;
    this._dragStartX = Number(d.x);
    this._dragStartY = Number(d.y);
    this._dragPointerId = Number(d.pointerId);
  }

  /**
   * @param {Record<string, unknown>} d
   */
  _onDragPointerMove(d) {
    if (!this._dragActive || Number(d.pointerId) !== this._dragPointerId) return;
    const x = Number(d.x);
    const y = Number(d.y);
    const dx = x - this._dragStartX;
    const dy = y - this._dragStartY;
    if (!this._dragStarted) {
      if (Math.hypot(dx, dy) >= this._dragThreshold) {
        this._dragStarted = true;
        this.hub.emit('drag:start', {
          x,
          y,
          dx,
          dy,
          pointerId: d.pointerId,
          pointerType: d.pointerType,
        });
      }
    } else {
      this.hub.emit('drag:move', {
        x,
        y,
        dx,
        dy,
        pointerId: d.pointerId,
        pointerType: d.pointerType,
      });
    }
  }

  /**
   * @param {Record<string, unknown>} d
   */
  _onDragPointerUp(d) {
    if (!this._dragActive || Number(d.pointerId) !== this._dragPointerId) return;
    if (this._dragStarted) {
      this.hub.emit('drag:end', {
        x: Number(d.x),
        y: Number(d.y),
        pointerId: d.pointerId,
        pointerType: d.pointerType,
      });
    }
    this._dragActive = false;
    this._dragStarted = false;
    this._dragPointerId = -1;
  }

  /**
   * @param {number} _dt
   */
  update(_dt) {
    let gx = 0;
    let gy = 0;
    if (this._gamepadEnabled && typeof navigator !== 'undefined' && navigator.getGamepads) {
      const pads = navigator.getGamepads() ?? [];
      const gp = [...pads].find((g) => g && g.connected) ?? null;
      if (gp) {
        if (gp.axes.length >= 2) {
          gx = gp.axes[0] ?? 0;
          gy = gp.axes[1] ?? 0;
        }
        const buttons = gp.buttons.map((b) => !!b?.pressed);
        const snap = { buttons, axes: [...gp.axes] };
        if (JSON.stringify(snap) !== JSON.stringify(this._lastGamepad)) {
          this._lastGamepad = snap;
          this.hub.emit('gamepad:changed', {
            index: gp.index,
            id: gp.id,
            axes: snap.axes,
            buttons,
          });
        }
      } else {
        this._lastGamepad = null;
      }
    }

    const vx = this.stick.x;
    const vy = this.stick.y;
    const dead = 0.12;
    const pick = (a, b) => {
      const A = Math.abs(a) > dead ? a : 0;
      const B = Math.abs(b) > dead ? b : 0;
      if (A === 0) return B;
      if (B === 0) return A;
      return Math.abs(A) >= Math.abs(B) ? A : B;
    };
    this.pointer.setStickFromGamepad(pick(gx, vx), pick(gy, vy));
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  setVirtualJoystick(x, y) {
    this.stick.x = Math.max(-1, Math.min(1, x));
    this.stick.y = Math.max(-1, Math.min(1, y));
    this.hub.emit('joystick:virtual', { x: this.stick.x, y: this.stick.y });
  }

  /**
   * @param {string} actionName
   */
  isActionDown(actionName) {
    const tokens = this.actions.getTokens(actionName);
    for (const t of tokens) {
      if (this._tokenActive(t)) return true;
    }
    return false;
  }

  /**
   * @param {string} token
   */
  _tokenActive(token) {
    const u = String(token).trim();
    if (u.startsWith('Mouse')) {
      const n = parseInt(u.slice(5), 10);
      if (Number.isNaN(n)) return false;
      return this.pointer.isDown && this.pointer.button === n;
    }
    if (u.startsWith('Gamepad')) {
      const n = parseInt(u.slice(7), 10);
      if (Number.isNaN(n) || !this._lastGamepad) return false;
      return !!this._lastGamepad.buttons[n];
    }
    if (u === 'StickLX') return (this.pointer.stickX ?? 0) < -0.25;
    if (u === 'StickRX') return (this.pointer.stickX ?? 0) > 0.25;
    if (u === 'StickLY') return (this.pointer.stickY ?? 0) < -0.25;
    if (u === 'StickRY') return (this.pointer.stickY ?? 0) > 0.25;
    return this.keyboard.isDown(u);
  }

  destroy() {
    this.dispose();
  }
}

/**
 * Merge system-declared input needs with optional JSON overrides.
 * @param {{ keyboard?: boolean, pointer?: boolean, wheel?: boolean, gamepad?: boolean }} fromSystems
 * @param {Record<string, unknown>} [inputRoot] config `input` block
 */
export function mergeInputRequirements(fromSystems, inputRoot = {}) {
  const force = /** @type {Record<string, unknown>} */ (inputRoot.requirements ?? {});
  const wheelBlock = /** @type {Record<string, unknown>} */ (inputRoot.wheel ?? {});
  const gpBlock = /** @type {Record<string, unknown>} */ (inputRoot.gamepad ?? {});
  return {
    keyboard: !!fromSystems.keyboard || !!force.keyboard,
    pointer: !!fromSystems.pointer || !!force.pointer,
    wheel: !!fromSystems.wheel || !!force.wheel || wheelBlock.enabled === true,
    gamepad: !!fromSystems.gamepad || !!force.gamepad || gpBlock.enabled === true,
  };
}
