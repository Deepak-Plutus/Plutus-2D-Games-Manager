import { Container, Graphics, Text } from 'pixi.js';

/**
 * Full-stage Pixi overlay: black background, centered status, percentage.
 */
export class LoadingScreen extends Container {
  constructor(width, height) {
    super();
    this.eventMode = 'none';
    this.zIndex = 100000;

    this._w = width;
    this._h = height;

    this._bg = new Graphics();
    this.addChild(this._bg);

    this._label = new Text({
      text: 'Loading...',
      style: {
        fill: 0xffffff,
        fontSize: 22,
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        align: 'center',
      },
    });
    this._label.anchor.set(0.5);
    this.addChild(this._label);

    this._percent = new Text({
      text: '0%',
      style: {
        fill: 0xaaaaaa,
        fontSize: 16,
        fontFamily: 'system-ui, Segoe UI, sans-serif',
        align: 'center',
      },
    });
    this._percent.anchor.set(0.5);
    this.addChild(this._percent);

    this.redraw();
  }

  resize(width, height) {
    this._w = width;
    this._h = height;
    this.redraw();
  }

  redraw() {
    const w = this._w;
    const h = this._h;
    this._bg.clear();
    this._bg.rect(0, 0, w, h);
    this._bg.fill({ color: 0x000000, alpha: 1 });

    this._label.position.set(w / 2, h / 2 - 14);
    this._percent.position.set(w / 2, h / 2 + 18);
  }

  /**
   * @param {number} percent 0–100
   * @param {string} [status] optional short status line (shown above %)
   */
  setProgress(percent, status) {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    if (status != null) {
      this._label.text = status;
    } else {
      this._label.text = 'Loading...';
    }
    this._percent.text = `${p}%`;
  }

  showError(message) {
    this._label.text = 'Error';
    this._label.style.fill = 0xff6b6b;
    this._percent.text = String(message).slice(0, 200);
    this._percent.style.fill = 0xffaaaa;
    this._percent.style.wordWrap = true;
    this._percent.style.wordWrapWidth = this._w - 40;
  }

  hide() {
    this.visible = false;
    this.parent?.removeChild(this);
    this.destroy({ children: true });
  }
}
