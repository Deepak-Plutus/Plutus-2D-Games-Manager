/**
 * Tracks held keys for default behavior controls (Construct-style default controls).
 * Optionally mirrors to {@link InputEventHub} (`keyboard:down` / `keyboard:up`).
 */
export class KeyboardInput {
  constructor() {
    /** @type {Set<string>} */
    this._down = new Set();
    /** @type {import('./InputEventHub.js').InputEventHub | null} */
    this._hub = null;
    this._boundDown = (e) => {
      if (e.repeat) {
        this._hub?.emit('keyboard:repeat', { code: e.code, key: e.key });
      } else {
        this._down.add(e.code);
        this._hub?.emit('keyboard:down', { code: e.code, key: e.key, repeat: false });
      }
    };
    this._boundUp = (e) => {
      this._down.delete(e.code);
      this._hub?.emit('keyboard:up', { code: e.code, key: e.key });
    };
  }

  /**
   * @param {import('./InputEventHub.js').InputEventHub | null} hub
   */
  setInputEventHub(hub) {
    this._hub = hub;
  }

  attach(target = window) {
    target.addEventListener('keydown', this._boundDown);
    target.addEventListener('keyup', this._boundUp);
  }

  detach(target = window) {
    target.removeEventListener('keydown', this._boundDown);
    target.removeEventListener('keyup', this._boundUp);
    this._down.clear();
  }

  isDown(code) {
    return this._down.has(code);
  }

  /** Left / platform left */
  get left() {
    return this.isDown('ArrowLeft') || this.isDown('KeyA');
  }

  get right() {
    return this.isDown('ArrowRight') || this.isDown('KeyD');
  }

  get up() {
    return this.isDown('ArrowUp') || this.isDown('KeyW');
  }

  get down() {
    return this.isDown('ArrowDown') || this.isDown('KeyS');
  }

  /** Jump (platform) */
  get jump() {
    return this.isDown('Space') || this.isDown('ArrowUp') || this.isDown('KeyW');
  }
}
