import { BaseBehavior } from './BaseBehavior.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { sineBehaviorDefaults } from './Config/sineBehaviorConfig.js'

const TAU = Math.PI * 2
const DEG = Math.PI / 180
type JsonRecord = Record<string, unknown>

/**
 * Oscillation behavior that applies wave offsets to transform/display properties.
 *
 * Can drive position, rotation, size, and opacity-style effects with several
 * waveform types and optional randomization at spawn.
 *
 * @example
 * { "type": "sine", "movement": "vertical", "period": 2.5, "magnitude": 18 }
 */
export class SineBehavior extends BaseBehavior {
  static type = 'sine'
  static priority = 62
  static defaultProperties = { ...sineBehaviorDefaults }

  movement = 'horizontal'
  wave = 'sine'
  period = 4
  magnitude = 50
  periodOffset = 0
  magnitudeRandom = 0
  periodRandom = 0
  randomizeInitialPhase = false
  private _phase = 0
  private _lastOffX = 0
  private _lastOffY = 0
  private _lastOffW = 0
  private _lastOffH = 0
  private _lastOffA = 0
  private _lastOffRot = 0

  constructor (json: JsonRecord = {}) {
    super(json)
    this._phase = (Number(this.periodOffset) / Math.max(1e-6, this.period)) * TAU
    if (this.randomizeInitialPhase) this._phase += Math.random() * TAU
    if (this.magnitudeRandom) this.magnitude += (Math.random() * 2 - 1) * Number(this.magnitudeRandom)
    if (this.periodRandom) this.period = Math.max(0.05, this.period + (Math.random() * 2 - 1) * Number(this.periodRandom))
  }

  /**
   * Applies wave and movement parameters from JSON.
   *
   * @param {JsonRecord} json Raw behavior config object.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.movement != null) this.movement = String(json.movement)
    if (json.wave != null) this.wave = String(json.wave)
    if (json.period != null) this.period = Number(json.period)
    if (json.magnitude != null) this.magnitude = Number(json.magnitude)
    if (json.periodOffset != null) this.periodOffset = Number(json.periodOffset)
    if (json.magnitudeRandom != null) this.magnitudeRandom = Number(json.magnitudeRandom)
    if (json.periodRandom != null) this.periodRandom = Number(json.periodRandom)
    if (json.randomizeInitialPhase != null) this.randomizeInitialPhase = !!json.randomizeInitialPhase
  }

  /**
   * Advances oscillation phase and applies delta offsets each frame.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled()) return
    const { transform, dt, displayView } = ctx
    const p = Math.max(1e-6, this.period)
    this._phase += (TAU / p) * dt
    const wv = sampleWave(this.wave, this._phase)
    const mag = this.magnitude * wv
    const mov = String(this.movement).toLowerCase()
    if (mov === 'horizontal') {
      transform.x += mag - this._lastOffX
      this._lastOffX = mag
    } else if (mov === 'vertical') {
      transform.y += mag - this._lastOffY
      this._lastOffY = mag
    } else if (mov === 'forwards' || mov === 'forward') {
      transform.x -= this._lastOffX
      transform.y -= this._lastOffY
      this._lastOffX = Math.cos(transform.rotation) * mag
      this._lastOffY = Math.sin(transform.rotation) * mag
      transform.x += this._lastOffX
      transform.y += this._lastOffY
    } else if (mov === 'backwards' || mov === 'backward') {
      transform.x -= this._lastOffX
      transform.y -= this._lastOffY
      this._lastOffX = -Math.cos(transform.rotation) * mag
      this._lastOffY = -Math.sin(transform.rotation) * mag
      transform.x += this._lastOffX
      transform.y += this._lastOffY
    } else if (mov === 'angle') {
      transform.rotation += mag * DEG - this._lastOffRot
      this._lastOffRot = mag * DEG
    } else if (displayView) {
      const v = displayView as { width: number; height: number; alpha?: number }
      if (mov === 'width') {
        v.width += mag - this._lastOffW
        this._lastOffW = mag
      } else if (mov === 'height') {
        v.height += mag - this._lastOffH
        this._lastOffH = mag
      } else if (mov === 'size') {
        v.width += mag - this._lastOffW
        v.height += mag - this._lastOffH
        this._lastOffW = mag
        this._lastOffH = mag
      } else if (mov === 'opacity') {
        const base = (v.alpha ?? 1) - this._lastOffA
        const off = wv * (this.magnitude / 100)
        const next = Math.max(0, Math.min(1, base + off))
        v.alpha = next
        this._lastOffA = next - base
      }
    }
  }
}

/**
 * Samples normalized wave output for a given phase.
 *
 * @param {string} wave Waveform name (`sine`, `triangle`, `square`, `sawtooth`, ...).
 * @param {number} phase Oscillation phase in radians.
 * @returns {number} Wave output in roughly `[-1, 1]`.
 */
function sampleWave (wave: string, phase: number): number {
  const t = (phase / TAU) % 1
  const w = String(wave).toLowerCase()
  if (w === 'triangle') return 1 - Math.abs(4 * t - 2)
  if (w === 'square') return t < 0.5 ? 1 : -1
  if (w === 'sawtooth') return 2 * t - 1
  if (w === 'reversesawtooth' || w === 'reverse_sawtooth') return 1 - 2 * t
  return Math.sin(phase)
}
