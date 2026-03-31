import { BaseBehavior } from './BaseBehavior.js';
import { sineBehaviorDefaults } from './Config/sineBehaviorConfig.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/**
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/sine
 */
export class SineBehavior extends BaseBehavior {
  static type = 'sine';
  static priority = 62;

  static defaultProperties = { ...sineBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** Period offset: seconds into the wave cycle (Construct-style). */
    /** @private */
    this._phase = (Number(this.periodOffset) / Math.max(1e-6, this.period)) * TAU;
    /** @private */
    this._lastOffX = 0;
    /** @private */
    this._lastOffY = 0;
    /** @private */
    this._lastOffW = 0;
    /** @private */
    this._lastOffH = 0;
    /** @private */
    this._lastOffA = 0;
    /** @private */
    this._lastOffRot = 0;
    if (this.randomizeInitialPhase) {
      this._phase += Math.random() * TAU;
    }
    const mr = Number(this.magnitudeRandom) || 0;
    if (mr !== 0) this.magnitude += (Math.random() * 2 - 1) * mr;
    const pr = Number(this.periodRandom) || 0;
    if (pr !== 0) this.period = Math.max(0.05, this.period + (Math.random() * 2 - 1) * pr);
  }

  applyJsonProperties(json) {
    if (json.movement != null) this.movement = String(json.movement);
    if (json.wave != null) this.wave = String(json.wave);
    if (json.period != null) this.period = Number(json.period);
    if (json.magnitude != null) this.magnitude = Number(json.magnitude);
    if (json.periodOffset != null) this.periodOffset = Number(json.periodOffset);
    if (json.magnitudeRandom != null) this.magnitudeRandom = Number(json.magnitudeRandom);
    if (json.periodRandom != null) this.periodRandom = Number(json.periodRandom);
    if (json.randomizeInitialPhase != null) this.randomizeInitialPhase = !!json.randomizeInitialPhase;
  }

  setMovement(m) {
    this.movement = String(m);
  }

  setWave(w) {
    this.wave = String(w);
  }

  setPeriod(p) {
    this.period = Number(p);
  }

  setMagnitude(m) {
    this.magnitude = Number(m);
  }

  setPeriodOffset(o) {
    this.periodOffset = Number(o);
    this._phase = (this.periodOffset / Math.max(1e-6, this.period)) * TAU;
  }

  get cyclePosition() {
    const p = Math.max(1e-6, this.period);
    return (this._phase / TAU) % 1;
  }

  get value() {
    return sampleWave(this.wave, this._phase) * this.magnitude;
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    if (!this.isEnabled()) return;
    const { transform, dt, displayView } = ctx;
    const p = Math.max(1e-6, this.period);
    this._phase += (TAU / p) * dt;

    const wv = sampleWave(this.wave, this._phase);
    const mag = this.magnitude * wv;
    const mov = String(this.movement).toLowerCase();

    if (mov === 'horizontal') {
      transform.x -= this._lastOffX;
      this._lastOffX = mag;
      transform.x += this._lastOffX;
    } else if (mov === 'vertical') {
      transform.y -= this._lastOffY;
      this._lastOffY = mag;
      transform.y += this._lastOffY;
    } else if (mov === 'forwards' || mov === 'forward') {
      transform.x -= this._lastOffX;
      transform.y -= this._lastOffY;
      this._lastOffX = Math.cos(transform.rotation) * mag;
      this._lastOffY = Math.sin(transform.rotation) * mag;
      transform.x += this._lastOffX;
      transform.y += this._lastOffY;
    } else if (mov === 'backwards' || mov === 'backward') {
      transform.x -= this._lastOffX;
      transform.y -= this._lastOffY;
      this._lastOffX = -Math.cos(transform.rotation) * mag;
      this._lastOffY = -Math.sin(transform.rotation) * mag;
      transform.x += this._lastOffX;
      transform.y += this._lastOffY;
    } else if (mov === 'angle') {
      transform.rotation -= this._lastOffRot;
      this._lastOffRot = mag * DEG;
      transform.rotation += this._lastOffRot;
    } else if (displayView) {
      if (mov === 'width') {
        displayView.width -= this._lastOffW;
        this._lastOffW = mag;
        displayView.width += this._lastOffW;
      } else if (mov === 'height') {
        displayView.height -= this._lastOffH;
        this._lastOffH = mag;
        displayView.height += this._lastOffH;
      } else if (mov === 'size') {
        displayView.width -= this._lastOffW;
        displayView.height -= this._lastOffH;
        this._lastOffW = mag;
        this._lastOffH = mag;
        displayView.width += this._lastOffW;
        displayView.height += this._lastOffH;
      } else if (mov === 'opacity') {
        const base = (displayView.alpha ?? 1) - this._lastOffA;
        const off = wv * (this.magnitude / 100);
        const next = Math.max(0, Math.min(1, base + off));
        displayView.alpha = next;
        this._lastOffA = next - base;
      }
    }
  }
}

/**
 * @param {string} wave
 * @param {number} phase radians
 */
function sampleWave(wave, phase) {
  const t = (phase / TAU) % 1;
  const w = String(wave).toLowerCase();
  if (w === 'triangle') {
    return 1 - Math.abs(4 * t - 2);
  }
  if (w === 'square') {
    return t < 0.5 ? 1 : -1;
  }
  if (w === 'sawtooth') {
    return 2 * t - 1;
  }
  if (w === 'reversesawtooth' || w === 'reverse_sawtooth') {
    return 1 - 2 * t;
  }
  return Math.sin(phase);
}
