import { Application } from 'pixi.js';

const DEFAULT_APP = {
  width: 800,
  height: 600,
  background: '#1a1a2e',
  antialias: true,
};

/**
 * Resolves `app` width/height from JSON. Use both `"width":"fullscreen"` and `"height":"fullscreen"`,
 * or `"fullscreen": true`, to size the canvas to `window.innerWidth` / `window.innerHeight`.
 * @param {Record<string, unknown>} appConfig
 * @param {number} fallbackW
 * @param {number} fallbackH
 * @returns {{ width: number, height: number }}
 */
export function resolveAppDimensions(appConfig, fallbackW, fallbackH) {
  if (!appConfig || typeof appConfig !== 'object') {
    return { width: fallbackW, height: fallbackH };
  }
  if (typeof window !== 'undefined') {
    if (appConfig.fullscreen === true) {
      return {
        width: Math.max(1, window.innerWidth),
        height: Math.max(1, window.innerHeight),
      };
    }
    const ws = appConfig.width;
    const hs = appConfig.height;
    const wFull = typeof ws === 'string' && ws.trim().toLowerCase() === 'fullscreen';
    const hFull = typeof hs === 'string' && hs.trim().toLowerCase() === 'fullscreen';
    if (wFull && hFull) {
      return {
        width: Math.max(1, window.innerWidth),
        height: Math.max(1, window.innerHeight),
      };
    }
  }
  const fw = Number(appConfig.width);
  const fh = Number(appConfig.height);
  return {
    width: Number.isFinite(fw) && fw > 0 ? fw : fallbackW,
    height: Number.isFinite(fh) && fh > 0 ? fh : fallbackH,
  };
}

export class AppHost {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    /** @type {import('pixi.js').Application | null} */
    this.app = null;
    this.width = DEFAULT_APP.width;
    this.height = DEFAULT_APP.height;
    this._background = DEFAULT_APP.background;
  }

  /**
   * Creates the Pixi application, appends canvas, initial size from optional override.
   * @param {Partial<typeof DEFAULT_APP>} [initialApp]
   */
  async init(initialApp = {}) {
    const { width: w, height: h } = resolveAppDimensions(
      /** @type {Record<string, unknown>} */ (initialApp),
      DEFAULT_APP.width,
      DEFAULT_APP.height,
    );
    this.width = w;
    this.height = h;
    this._background = initialApp.background ?? DEFAULT_APP.background;

    this.app = new Application();
    await this.app.init({
      width: w,
      height: h,
      background: this._background,
      antialias: initialApp.antialias ?? DEFAULT_APP.antialias,
      autoDensity: true,
      resolution: Math.max(1, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
    });
    globalThis.__PIXI_APP__ = this.app;
    this.container.replaceChildren(this.app.canvas);
    this.app.stage.sortableChildren = true;
    return this.app;
  }

  /**
   * Applies `app` block from parsed game JSON (resize renderer + canvas backing store).
   * @param {Record<string, unknown>} [appConfig]
   */
  applyAppConfig(appConfig = {}) {
    if (!this.app) return;

    const { width: w, height: h } = resolveAppDimensions(
      /** @type {Record<string, unknown>} */ (appConfig),
      this.width,
      this.height,
    );
    this.width = w;
    this.height = h;

    this.app.renderer.resize(w, h);
    if (typeof appConfig.background === 'string' && appConfig.background) {
      this.app.renderer.background.color = appConfig.background;
    }
  }

  get stage() {
    return this.app?.stage ?? null;
  }
}
