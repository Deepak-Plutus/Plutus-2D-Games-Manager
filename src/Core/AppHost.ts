import { Application } from 'pixi.js'

const DEFAULT_APP = {
  width: 800,
  height: 600,
  background: '#1a1a2e',
  antialias: true
} as const

type AppConfig = Partial<{
  width: number | string
  height: number | string
  background: string
  antialias: boolean
  fullscreen: boolean
}>

/**
 * Resolves app canvas dimensions from config and fallbacks.
 *
 * @param {Record<string, unknown>} appConfig App config object.
 * @param {number} fallbackW Default width.
 * @param {number} fallbackH Default height.
 * @returns {{ width: number; height: number }}
 */
export function resolveAppDimensions (
  appConfig: Record<string, unknown>,
  fallbackW: number,
  fallbackH: number
): { width: number; height: number } {
  if (!appConfig || typeof appConfig !== 'object') {
    return { width: fallbackW, height: fallbackH }
  }
  if (typeof window !== 'undefined') {
    if (appConfig.fullscreen === true) {
      return { width: Math.max(1, window.innerWidth), height: Math.max(1, window.innerHeight) }
    }
    const ws = appConfig.width
    const hs = appConfig.height
    const wFull = typeof ws === 'string' && ws.trim().toLowerCase() === 'fullscreen'
    const hFull = typeof hs === 'string' && hs.trim().toLowerCase() === 'fullscreen'
    if (wFull && hFull) {
      return { width: Math.max(1, window.innerWidth), height: Math.max(1, window.innerHeight) }
    }
  }
  const fw = Number(appConfig.width)
  const fh = Number(appConfig.height)
  return {
    width: Number.isFinite(fw) && fw > 0 ? fw : fallbackW,
    height: Number.isFinite(fh) && fh > 0 ? fh : fallbackH
  }
}

/**
 * Owns Pixi `Application` setup and resize/apply-config operations.
 */
export class AppHost {
  container: HTMLElement
  app: Application | null
  width: number
  height: number
  private _background: string

  /**
   * @param {HTMLElement} container Host element where the Pixi canvas is mounted.
   */
  constructor (container: HTMLElement) {
    this.container = container
    this.app = null
    this.width = DEFAULT_APP.width
    this.height = DEFAULT_APP.height
    this._background = DEFAULT_APP.background
  }

  /**
   * Initializes Pixi application and mounts it to container.
   *
   * @param {AppConfig} initialApp Optional initial app config.
   * @returns {Promise<Application>} Initialized Pixi application.
   */
  async init (initialApp: AppConfig = {}): Promise<Application> {
    const { width: w, height: h } = resolveAppDimensions(
      initialApp as Record<string, unknown>,
      DEFAULT_APP.width,
      DEFAULT_APP.height
    )
    this.width = w
    this.height = h
    this._background = initialApp.background ?? DEFAULT_APP.background

    this.app = new Application()
    await this.app.init({
      width: w,
      height: h,
      background: this._background,
      antialias: initialApp.antialias ?? DEFAULT_APP.antialias,
      autoDensity: true,
      resolution: Math.max(1, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
    })
    ;(globalThis as Record<string, unknown>).__PIXI_APP__ = this.app
    this.container.replaceChildren(this.app.canvas)
    this.app.stage.sortableChildren = true
    return this.app
  }

  /**
   * Applies runtime app config updates (resize/background).
   *
   * @param {Record<string, unknown>} appConfig App config block.
   * @returns {void} Nothing.
   */
  applyAppConfig (appConfig: Record<string, unknown> = {}): void {
    if (!this.app) return
    const { width: w, height: h } = resolveAppDimensions(appConfig, this.width, this.height)
    this.width = w
    this.height = h
    this.app.renderer.resize(w, h)
    if (typeof appConfig.background === 'string' && appConfig.background) {
      this.app.renderer.background.color = appConfig.background
    }
  }

  /**
   * Current stage if initialized.
   *
   * @returns {Application['stage'] | null} Stage when initialized.
   */
  get stage () {
    return this.app?.stage ?? null
  }
}
