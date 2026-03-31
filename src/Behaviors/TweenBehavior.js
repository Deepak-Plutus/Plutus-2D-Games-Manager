import gsap from 'gsap';
import { BaseBehavior } from './BaseBehavior.js';
import { tweenBehaviorDefaults } from './Config/tweenBehaviorConfig.js';

const DEG = Math.PI / 180;

/**
 * GSAP-driven tweens on transform / display (Construct Tween–style API subset).
 *
 * @see https://www.construct.net/en/make-games/manuals/construct-3/behavior-reference/tween
 */
export class TweenBehavior extends BaseBehavior {
  static type = 'tween';
  static priority = 55;

  static defaultProperties = { ...tweenBehaviorDefaults };

  constructor(json = {}) {
    super(json);
    /** @private @type {Map<string, gsap.core.Tween>} */
    this._tweens = new Map();
    /** @private */
    this._runtimeCtx = null;
  }

  applyJsonProperties(json) {
    if (json.defaultDuration != null) this.defaultDuration = Number(json.defaultDuration);
    if (json.defaultEase != null) this.defaultEase = String(json.defaultEase);
    if (json.defaultRepeat != null) this.defaultRepeat = Number(json.defaultRepeat);
    if (json.defaultYoyo != null) this.defaultYoyo = !!json.defaultYoyo;
    if (json.stopOnDisable != null) this.stopOnDisable = !!json.stopOnDisable;
  }

  setEnabled(value) {
    super.setEnabled(value);
    if (!value && this.stopOnDisable) this.stopAllTweens();
  }

  setDefaultDuration(d) {
    this.defaultDuration = Number(d);
  }

  setDefaultEase(ease) {
    this.defaultEase = String(ease);
  }

  setDefaultRepeat(n) {
    this.defaultRepeat = Number(n);
  }

  setDefaultYoyo(v) {
    this.defaultYoyo = !!v;
  }

  /**
   * @param {string} [tag]
   */
  isTweening(tag) {
    if (tag != null && tag !== '') return this._tweens.has(String(tag));
    return this._tweens.size > 0;
  }

  /**
   * @param {string} [tag]
   * @returns {number} 0..1 or -1 if missing
   */
  getTweenProgress(tag = 'default') {
    const t = this._tweens.get(String(tag));
    if (!t) return -1;
    return typeof t.progress === 'function' ? t.progress() : -1;
  }

  stopTween(tag) {
    const t = this._tweens.get(String(tag));
    if (t) {
      t.kill();
      this._tweens.delete(String(tag));
    }
  }

  stopAllTweens() {
    for (const t of this._tweens.values()) t.kill();
    this._tweens.clear();
  }

  pauseTween(tag) {
    this._tweens.get(String(tag))?.pause();
  }

  resumeTween(tag) {
    this._tweens.get(String(tag))?.resume();
  }

  pauseAllTweens() {
    for (const t of this._tweens.values()) t.pause();
  }

  resumeAllTweens() {
    for (const t of this._tweens.values()) t.resume();
  }

  /**
   * One numeric property on transform or display.
   * @param {string} property x|y|width|height|angle|opacity|scaleX|scaleY|rotation
   * @param {number} endValue angle in degrees for `angle`; opacity 0..1
   * @param {string} [tag]
   */
  startTweenOne(property, endValue, duration, ease, tag = 'default') {
    const ctx = this._runtimeCtx;
    if (!ctx) return;
    const prop = String(property).toLowerCase();
    const dur = duration != null ? Number(duration) : this.defaultDuration;
    const es = normalizeEase(ease != null ? String(ease) : this.defaultEase);
    const tg = String(tag);
    this.stopTween(tg);

    const rep = this.defaultRepeat;
    const yoyo = this.defaultYoyo;
    const { transform, displayView, entityId, events } = ctx;

    /** @type {gsap.TweenVars} */
    const common = {
      duration: Math.max(1e-6, dur),
      ease: es,
      repeat: rep < 0 ? -1 : rep,
      yoyo,
      overwrite: 'auto',
      onComplete: () => {
        this._tweens.delete(tg);
        events?.emit('tween:complete', { entityId, tag: tg, property: prop });
      },
    };

    let tw;
    if (prop === 'opacity' || prop === 'alpha') {
      if (!displayView) return;
      tw = gsap.to(displayView, { alpha: Number(endValue), ...common });
    } else if (prop === 'width') {
      if (!displayView) return;
      tw = gsap.to(displayView, { width: Number(endValue), ...common });
    } else if (prop === 'height') {
      if (!displayView) return;
      tw = gsap.to(displayView, { height: Number(endValue), ...common });
    } else if (prop === 'angle') {
      const targetRad = Number(endValue) * DEG;
      tw = gsap.to(transform, { rotation: targetRad, ...common });
    } else if (prop === 'x') {
      tw = gsap.to(transform, { x: Number(endValue), ...common });
    } else if (prop === 'y') {
      tw = gsap.to(transform, { y: Number(endValue), ...common });
    } else if (prop === 'rotation') {
      tw = gsap.to(transform, { rotation: Number(endValue), ...common });
    } else if (prop === 'scalex') {
      tw = gsap.to(transform, { scaleX: Number(endValue), ...common });
    } else if (prop === 'scaley') {
      tw = gsap.to(transform, { scaleY: Number(endValue), ...common });
    } else return;

    this._tweens.set(tg, tw);
    events?.emit('tween:started', { entityId, tag: tg, property: prop });
  }

  /**
   * Two-value tween: position (x,y), size (w,h), scale (sx,sy)
   * @param {'position'|'size'|'scale'} property
   * @param {string} [tag]
   */
  startTweenTwo(property, endA, endB, duration, ease, tag = 'default') {
    const ctx = this._runtimeCtx;
    if (!ctx) return;
    const prop = String(property).toLowerCase();
    const dur = duration != null ? Number(duration) : this.defaultDuration;
    const es = normalizeEase(ease != null ? String(ease) : this.defaultEase);
    const tg = String(tag);
    this.stopTween(tg);
    const rep = this.defaultRepeat;
    const yoyo = this.defaultYoyo;
    const { transform, displayView, entityId, events } = ctx;

    /** @type {gsap.TweenVars} */
    const common2 = {
      duration: Math.max(1e-6, dur),
      ease: es,
      repeat: rep < 0 ? -1 : rep,
      yoyo,
      overwrite: 'auto',
      onComplete: () => {
        this._tweens.delete(tg);
        events?.emit('tween:complete', { entityId, tag: tg, property: prop });
      },
    };

    let tw;
    if (prop === 'position') {
      tw = gsap.to(transform, { x: Number(endA), y: Number(endB), ...common2 });
    } else if (prop === 'size') {
      if (!displayView) return;
      tw = gsap.to(displayView, { width: Number(endA), height: Number(endB), ...common2 });
    } else if (prop === 'scale') {
      tw = gsap.to(transform, { scaleX: Number(endA), scaleY: Number(endB), ...common2 });
    } else return;

    this._tweens.set(tg, tw);
    events?.emit('tween:started', { entityId, tag: tg, property: prop });
  }

  /**
   * @param {import('./BehaviorRuntimeContext.js').BehaviorRuntimeContext} ctx
   */
  tick(ctx) {
    this._runtimeCtx = ctx;
  }
}

/**
 * Map Construct-style ease names to GSAP where possible.
 * @param {string} ease
 */
function normalizeEase(ease) {
  const k = ease.trim().toLowerCase().replace(/_/g, '-');
  const map = {
    linear: 'none',
    'in-out-sine': 'sine.inOut',
    'in-sine': 'sine.in',
    'out-sine': 'sine.out',
    'in-out-quad': 'power2.inOut',
    'in-quad': 'power2.in',
    'out-quad': 'power2.out',
    'in-out-cubic': 'power3.inOut',
    'in-cubic': 'power3.in',
    'out-cubic': 'power3.out',
  };
  return map[k] ?? ease;
}
