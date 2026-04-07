import type { InputEventHub } from './InputEventHub.js'

export class KeyboardInput {
  private _down: Set<string>
  private _hub: InputEventHub | null
  private readonly _boundDown: (e: KeyboardEvent) => void
  private readonly _boundUp: (e: KeyboardEvent) => void

  constructor () {
    this._down = new Set()
    this._hub = null
    this._boundDown = (e: KeyboardEvent) => {
      if (e.repeat) {
        this._hub?.emit('keyboard:repeat', { code: e.code, key: e.key })
      } else {
        this._down.add(e.code)
        this._hub?.emit('keyboard:down', { code: e.code, key: e.key, repeat: false })
      }
    }
    this._boundUp = (e: KeyboardEvent) => {
      this._down.delete(e.code)
      this._hub?.emit('keyboard:up', { code: e.code, key: e.key })
    }
  }

  setInputEventHub (hub: InputEventHub | null): void {
    this._hub = hub
  }

  attach (target: Window = window): void {
    target.addEventListener('keydown', this._boundDown)
    target.addEventListener('keyup', this._boundUp)
  }

  detach (target: Window = window): void {
    target.removeEventListener('keydown', this._boundDown)
    target.removeEventListener('keyup', this._boundUp)
    this._down.clear()
  }

  isDown (code: string): boolean {
    return this._down.has(code)
  }

  get left (): boolean {
    return this.isDown('ArrowLeft') || this.isDown('KeyA')
  }
  get right (): boolean {
    return this.isDown('ArrowRight') || this.isDown('KeyD')
  }
  get up (): boolean {
    return this.isDown('ArrowUp') || this.isDown('KeyW')
  }
  get down (): boolean {
    return this.isDown('ArrowDown') || this.isDown('KeyS')
  }
  get jump (): boolean {
    return this.isDown('Space') || this.isDown('ArrowUp') || this.isDown('KeyW')
  }
}
