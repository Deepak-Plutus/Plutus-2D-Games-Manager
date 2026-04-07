import { InputActionMap } from './InputActionMap.js'
import type { InputEventHub } from './InputEventHub.js'
import type { KeyboardInput } from './KeyboardInput.js'
import type { PointerInput } from './PointerInput.js'

type Requirements = { keyboard?: boolean; pointer?: boolean; wheel?: boolean; gamepad?: boolean }
type GamepadSnapshot = { buttons: boolean[]; axes: number[] }
type PointerDetail = Record<string, unknown>

export class InputCoordinator {
  hub: InputEventHub
  keyboard: KeyboardInput
  pointer: PointerInput
  actions: InputActionMap
  stick: { x: number; y: number }
  private _lastGamepad: GamepadSnapshot | null
  private _canvas: HTMLCanvasElement | null
  private readonly _wheelHandler: (e: WheelEvent) => void
  private _dragThreshold: number
  private _dragActive: boolean
  private _dragStarted: boolean
  private _dragStartX: number
  private _dragStartY: number
  private _dragPointerId: number
  private _req: Required<Requirements>
  private _gamepadEnabled: boolean
  private _unsubs: Array<() => void>
  private readonly _drDown: (ev: Event) => void
  private readonly _drMove: (ev: Event) => void
  private readonly _drUp: (ev: Event) => void

  constructor (hub: InputEventHub, keyboard: KeyboardInput, pointer: PointerInput) {
    this.hub = hub
    this.keyboard = keyboard
    this.pointer = pointer
    this.actions = new InputActionMap()
    this.stick = { x: 0, y: 0 }
    this._lastGamepad = null
    this._canvas = null
    this._wheelHandler = (e: WheelEvent) => this._onWheel(e)
    this._dragThreshold = 4
    this._dragActive = false
    this._dragStarted = false
    this._dragStartX = 0
    this._dragStartY = 0
    this._dragPointerId = -1
    this._req = { keyboard: false, pointer: false, wheel: false, gamepad: false }
    this._gamepadEnabled = false
    this._unsubs = []
    this._drDown = (ev: Event) => this._onDragPointerDown((ev as CustomEvent).detail as PointerDetail)
    this._drMove = (ev: Event) => this._onDragPointerMove((ev as CustomEvent).detail as PointerDetail)
    this._drUp = (ev: Event) => this._onDragPointerUp((ev as CustomEvent).detail as PointerDetail)
  }

  configure (
    canvas: HTMLCanvasElement | null,
    _layoutW: number,
    _layoutH: number,
    inputConfig: Record<string, unknown> = {},
    requirements: Requirements = {}
  ): void {
    this.dispose()
    this._canvas = canvas
    this.actions = InputActionMap.fromConfig(inputConfig)
    this._dragThreshold = inputConfig.dragThreshold != null ? Number(inputConfig.dragThreshold) : 4
    this._gamepadEnabled =
      !!requirements.gamepad || !!((inputConfig.gamepad ?? {}) as Record<string, unknown>).enabled
    this._req = {
      keyboard: !!requirements.keyboard,
      pointer: !!requirements.pointer,
      wheel: !!requirements.wheel || !!((inputConfig.wheel ?? {}) as Record<string, unknown>).enabled,
      gamepad: this._gamepadEnabled
    }

    if (this._req.wheel && canvas) canvas.addEventListener('wheel', this._wheelHandler, { passive: true })
    this.keyboard.setInputEventHub(this._req.keyboard ? this.hub : null)
    this.pointer.setInputEventHub(this._req.pointer ? this.hub : null)

    if (this._req.pointer) {
      this.hub.addEventListener('pointer:down', this._drDown)
      this.hub.addEventListener('pointer:move', this._drMove)
      this.hub.addEventListener('pointer:up', this._drUp)
      this._unsubs.push(() => this.hub.removeEventListener('pointer:down', this._drDown))
      this._unsubs.push(() => this.hub.removeEventListener('pointer:move', this._drMove))
      this._unsubs.push(() => this.hub.removeEventListener('pointer:up', this._drUp))
    }
  }

  dispose (): void {
    this._canvas?.removeEventListener('wheel', this._wheelHandler)
    for (const u of this._unsubs) u()
    this._unsubs = []
    this.keyboard.setInputEventHub(null)
    this.pointer.setInputEventHub(null)
  }

  private _onWheel (e: WheelEvent): void {
    const p = this.pointer.clientToLayout(e.clientX, e.clientY)
    this.hub.emit('wheel', { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode, x: p.x, y: p.y })
  }

  private _onDragPointerDown (d: PointerDetail): void {
    this._dragActive = true
    this._dragStarted = false
    this._dragStartX = Number(d.x)
    this._dragStartY = Number(d.y)
    this._dragPointerId = Number(d.pointerId)
  }

  private _onDragPointerMove (d: PointerDetail): void {
    if (!this._dragActive || Number(d.pointerId) !== this._dragPointerId) return
    const x = Number(d.x)
    const y = Number(d.y)
    const dx = x - this._dragStartX
    const dy = y - this._dragStartY
    if (!this._dragStarted) {
      if (Math.hypot(dx, dy) >= this._dragThreshold) {
        this._dragStarted = true
        this.hub.emit('drag:start', { x, y, dx, dy, pointerId: d.pointerId, pointerType: d.pointerType })
      }
    } else {
      this.hub.emit('drag:move', { x, y, dx, dy, pointerId: d.pointerId, pointerType: d.pointerType })
    }
  }

  private _onDragPointerUp (d: PointerDetail): void {
    if (!this._dragActive || Number(d.pointerId) !== this._dragPointerId) return
    if (this._dragStarted) {
      this.hub.emit('drag:end', { x: Number(d.x), y: Number(d.y), pointerId: d.pointerId, pointerType: d.pointerType })
    }
    this._dragActive = false
    this._dragStarted = false
    this._dragPointerId = -1
  }

  update (_dt: number): void {
    let gx = 0
    let gy = 0
    if (this._gamepadEnabled && typeof navigator !== 'undefined' && navigator.getGamepads) {
      const pads = navigator.getGamepads() ?? []
      const gp = [...pads].find(g => g && g.connected) ?? null
      if (gp) {
        if (gp.axes.length >= 2) {
          gx = gp.axes[0] ?? 0
          gy = gp.axes[1] ?? 0
        }
        const buttons = gp.buttons.map(b => !!b?.pressed)
        const snap: GamepadSnapshot = { buttons, axes: [...gp.axes] }
        if (JSON.stringify(snap) !== JSON.stringify(this._lastGamepad)) {
          this._lastGamepad = snap
          this.hub.emit('gamepad:changed', { index: gp.index, id: gp.id, axes: snap.axes, buttons })
        }
      } else {
        this._lastGamepad = null
      }
    }

    const dead = 0.12
    const pick = (a: number, b: number): number => {
      const A = Math.abs(a) > dead ? a : 0
      const B = Math.abs(b) > dead ? b : 0
      if (A === 0) return B
      if (B === 0) return A
      return Math.abs(A) >= Math.abs(B) ? A : B
    }
    this.pointer.setStickFromGamepad(pick(gx, this.stick.x), pick(gy, this.stick.y))
  }

  setVirtualJoystick (x: number, y: number): void {
    this.stick.x = Math.max(-1, Math.min(1, x))
    this.stick.y = Math.max(-1, Math.min(1, y))
    this.hub.emit('joystick:virtual', { x: this.stick.x, y: this.stick.y })
  }

  isActionDown (actionName: string): boolean {
    const tokens = this.actions.getTokens(actionName)
    for (const t of tokens) {
      if (this._tokenActive(t)) return true
    }
    return false
  }

  private _tokenActive (token: string): boolean {
    const u = String(token).trim()
    if (u.startsWith('Mouse')) {
      const n = parseInt(u.slice(5), 10)
      if (Number.isNaN(n)) return false
      return this.pointer.isDown && this.pointer.button === n
    }
    if (u.startsWith('Gamepad')) {
      const n = parseInt(u.slice(7), 10)
      if (Number.isNaN(n) || !this._lastGamepad) return false
      return !!this._lastGamepad.buttons[n]
    }
    if (u === 'StickLX') return (this.pointer.stickX ?? 0) < -0.25
    if (u === 'StickRX') return (this.pointer.stickX ?? 0) > 0.25
    if (u === 'StickLY') return (this.pointer.stickY ?? 0) < -0.25
    if (u === 'StickRY') return (this.pointer.stickY ?? 0) > 0.25
    return this.keyboard.isDown(u)
  }

  destroy (): void {
    this.dispose()
  }
}

export function mergeInputRequirements (
  fromSystems: Requirements,
  inputRoot: Record<string, unknown> = {}
): Required<Requirements> {
  const force = (inputRoot.requirements ?? {}) as Record<string, unknown>
  const wheelBlock = (inputRoot.wheel ?? {}) as Record<string, unknown>
  const gpBlock = (inputRoot.gamepad ?? {}) as Record<string, unknown>
  return {
    keyboard: !!fromSystems.keyboard || !!force.keyboard,
    pointer: !!fromSystems.pointer || !!force.pointer,
    wheel: !!fromSystems.wheel || !!force.wheel || wheelBlock.enabled === true,
    gamepad: !!fromSystems.gamepad || !!force.gamepad || gpBlock.enabled === true
  }
}
