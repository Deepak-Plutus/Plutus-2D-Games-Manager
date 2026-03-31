/**
 * AI, targeting, patrol, detection, entity input, audio, timers, tags, lifetime, tween/anim.
 */
export class AIState {
  constructor(opts = {}) {
    this.state = String(opts.state ?? 'idle');
    /** @type {Record<string, unknown>} */
    this.params = typeof opts.params === 'object' && opts.params ? { ...opts.params } : {};
    this.timeInState = Number(opts.timeInState) || 0;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new AIState(json);
  }
}

export class Target {
  constructor(opts = {}) {
    this.entityId = opts.entityId != null ? Number(opts.entityId) : null;
    this.metaName = opts.metaName != null ? String(opts.metaName) : '';
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Target(json);
  }
}

export class PatrolPath {
  constructor(opts = {}) {
    /** @type {{ x: number, y: number }[]} */
    this.waypoints = Array.isArray(opts.waypoints)
      ? opts.waypoints.map((p) => ({
          x: Number(/** @type {Record<string, unknown>} */ (p).x) || 0,
          y: Number(/** @type {Record<string, unknown>} */ (p).y) || 0,
        }))
      : [];
    this.loop = opts.loop !== false;
    this.index = Number(opts.index) || 0;
    this.waitAtPoint = Number(opts.waitAtPoint) || 0;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new PatrolPath(json);
  }
}

export class DetectionRadius {
  constructor(opts = {}) {
    this.radius = Number(opts.radius) || 100;
    this.layers = Number(opts.layers) || 0xffffffff;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new DetectionRadius(json);
  }
}

export class EntityInput {
  constructor(opts = {}) {
    /** Preferred logical action names this entity consumes */
    this.enabledActions = Array.isArray(opts.enabledActions)
      ? opts.enabledActions.map(String)
      : [];
    this.enabled = opts.enabled !== false;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new EntityInput(json);
  }
}

export class AudioSource {
  constructor(opts = {}) {
    this.clipId = String(opts.clipId ?? opts.assetId ?? '');
    this.volume = Number(opts.volume) ?? 1;
    this.loop = !!opts.loop;
    this.playOnSpawn = !!opts.playOnSpawn;
    this.spatial = !!opts.spatial;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new AudioSource(json);
  }
}

export class EntityTimer {
  constructor(opts = {}) {
    /** @type {Record<string, { duration: number, elapsed: number, repeating: boolean, active: boolean }>} */
    this.slots = {};
    if (opts.slots && typeof opts.slots === 'object') {
      for (const [k, v] of Object.entries(opts.slots)) {
        const s = /** @type {Record<string, unknown>} */ (v);
        this.slots[k] = {
          duration: Number(s.duration) || 1,
          elapsed: Number(s.elapsed) || 0,
          repeating: !!s.repeating,
          active: s.active !== false,
        };
      }
    }
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new EntityTimer(json);
  }
}

export class Tags {
  constructor(tags = []) {
    /** @type {string[]} */
    this.list = Array.isArray(tags) ? tags.map(String) : [];
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    const t = json.tags ?? json.list;
    return new Tags(Array.isArray(t) ? t : []);
  }

  has(tag) {
    return this.list.includes(String(tag));
  }
}

export class Lifetime {
  constructor(opts = {}) {
    this.remaining = Number(opts.remaining ?? opts.duration) || 0;
    this.max = Number(opts.max ?? opts.remaining ?? opts.duration) || this.remaining;
    this.destroyOnExpire = opts.destroyOnExpire !== false;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Lifetime(json);
  }
}

export class TweenAnimation {
  constructor(opts = {}) {
    this.playing = !!opts.playing;
    this.clipId = String(opts.clipId ?? '');
    this.speed = Number(opts.speed) || 1;
    this.loop = !!opts.loop;
    this.time = Number(opts.time) || 0;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new TweenAnimation(json);
  }
}
