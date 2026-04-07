import type { InputEventHub } from './InputEventHub.js'

type PointerDetail = Record<string, unknown>

export class PointerInput {
  x: number
  y: number
  isDown: boolean
  button: number
  stickX: number
  stickY: number
  private _canvas: HTMLCanvasElement | null
  private _w: number
  private _h: number
  private _hub: InputEventHub | null
  private readonly _down: (e: PointerEvent) => void
  private readonly _up: (e: PointerEvent) => void
  private readonly _move: (e: PointerEvent) => void
  private readonly _leave: (e: PointerEvent) => void
  private _activePointerId: number

  constructor () {
    this.x = 0
    this.y = 0
    this.isDown = false
    this.button = -1
    this.stickX = 0
    this.stickY = 0
    this._canvas = null
    this._w = 800
    this._h = 600
    this._hub = null
    this._down = this._onPointerDown.bind(this)
    this._up = this._onPointerUp.bind(this)
    this._move = this._onPointerMove.bind(this)
    this._leave = this._onPointerLeave.bind(this)
    this._activePointerId = 0
  }

  attach (canvas: HTMLCanvasElement, layoutWidth: number, layoutHeight: number): void {
    this.detach()
    this._canvas = canvas
    this._w = layoutWidth
    this._h = layoutHeight
    canvas.addEventListener('pointerdown', this._down)
    canvas.addEventListener('pointerleave', this._leave)
    window.addEventListener('pointerup', this._up)
    window.addEventListener('pointercancel', this._up)
    window.addEventListener('pointermove', this._move)
  }

  detach (): void {
    if (!this._canvas) return
    this._canvas.removeEventListener('pointerdown', this._down)
    this._canvas.removeEventListener('pointerleave', this._leave)
    window.removeEventListener('pointerup', this._up)
    window.removeEventListener('pointercancel', this._up)
    window.removeEventListener('pointermove', this._move)
    this._canvas = null
    this.isDown = false
  }

  setLayoutSize (w: number, h: number): void {
    this._w = w
    this._h = h
  }

  setInputEventHub (hub: InputEventHub | null): void {
    this._hub = hub
  }

  setStickFromGamepad (x: number, y: number): void {
    this.stickX = x
    this.stickY = y
  }

  clientToLayout (clientX: number, clientY: number): { x: number; y: number } {
    return this._toLocalCoords(clientX, clientY)
  }

  private _toLocalCoords (clientX: number, clientY: number): { x: number; y: number } {
    if (!this._canvas) return { x: 0, y: 0 }
    const r = this._canvas.getBoundingClientRect()
    const nx = (clientX - r.left) / Math.max(r.width, 1)
    const ny = (clientY - r.top) / Math.max(r.height, 1)
    return { x: nx * this._w, y: ny * this._h }
  }

  private _emitPointer (type: string, e: PointerEvent, extra: PointerDetail = {}): void {
    const p = this._toLocalCoords(e.clientX, e.clientY)
    this._hub?.emit(type, {
      x: p.x,
      y: p.y,
      clientX: e.clientX,
      clientY: e.clientY,
      button: e.button,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      pressure: e.pressure,
      ...extra
    })
  }

  private _onPointerDown (e: PointerEvent): void {
    if (!this._canvas || e.target !== this._canvas) return
    this.isDown = true
    this.button = e.button
    this._activePointerId = e.pointerId
    const p = this._toLocalCoords(e.clientX, e.clientY)
    this.x = p.x
    this.y = p.y
    this._emitPointer('pointer:down', e)
    this._hub?.emit('pointer:tap:start', {
      x: p.x,
      y: p.y,
      pointerId: e.pointerId,
      pointerType: e.pointerType
    })
  }

  private _onPointerUp (e: PointerEvent): void {
    if (!this.isDown || e.pointerId !== this._activePointerId) return
    this._emitPointer('pointer:up', e)
    this._hub?.emit('pointer:tap:end', {
      x: this.x,
      y: this.y,
      pointerId: e.pointerId,
      pointerType: e.pointerType
    })
    this.isDown = false
    this.button = -1
  }

  private _onPointerMove (e: PointerEvent): void {
    const p = this._toLocalCoords(e.clientX, e.clientY)
    this.x = p.x
    this.y = p.y
    this._emitPointer('pointer:move', e)
  }

  private _onPointerLeave (e: PointerEvent): void {
    this._emitPointer('pointer:leave', e)
  }
}
