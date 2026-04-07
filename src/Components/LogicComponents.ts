type JsonRecord = Record<string, unknown>
type TimerSlot = { duration: number; elapsed: number; repeating: boolean; active: boolean }

export class AIState {
  state: string
  params: Record<string, unknown>
  timeInState: number

  constructor (opts: JsonRecord = {}) {
    this.state = String(opts.state ?? 'idle')
    this.params = typeof opts.params === 'object' && opts.params ? { ...(opts.params as JsonRecord) } : {}
    this.timeInState = Number(opts.timeInState) || 0
  }

  static fromJson (json: JsonRecord = {}): AIState {
    return new AIState(json)
  }
}

export class Target {
  entityId: number | null
  metaName: string
  constructor (opts: JsonRecord = {}) {
    this.entityId = opts.entityId != null ? Number(opts.entityId) : null
    this.metaName = opts.metaName != null ? String(opts.metaName) : ''
  }
  static fromJson (json: JsonRecord = {}): Target {
    return new Target(json)
  }
}

export class PatrolPath {
  waypoints: Array<{ x: number; y: number }>
  loop: boolean
  index: number
  waitAtPoint: number
  constructor (opts: JsonRecord = {}) {
    this.waypoints = Array.isArray(opts.waypoints)
      ? opts.waypoints.map(p => ({
          x: Number((p as JsonRecord).x) || 0,
          y: Number((p as JsonRecord).y) || 0
        }))
      : []
    this.loop = opts.loop !== false
    this.index = Number(opts.index) || 0
    this.waitAtPoint = Number(opts.waitAtPoint) || 0
  }
  static fromJson (json: JsonRecord = {}): PatrolPath {
    return new PatrolPath(json)
  }
}

export class DetectionRadius {
  radius: number
  layers: number
  constructor (opts: JsonRecord = {}) {
    this.radius = Number(opts.radius) || 100
    this.layers = Number(opts.layers) || 0xffffffff
  }
  static fromJson (json: JsonRecord = {}): DetectionRadius {
    return new DetectionRadius(json)
  }
}

export class EntityInput {
  enabledActions: string[]
  enabled: boolean
  constructor (opts: JsonRecord = {}) {
    this.enabledActions = Array.isArray(opts.enabledActions) ? opts.enabledActions.map(String) : []
    this.enabled = opts.enabled !== false
  }
  static fromJson (json: JsonRecord = {}): EntityInput {
    return new EntityInput(json)
  }
}

export class AudioSource {
  clipId: string
  volume: number
  loop: boolean
  playOnSpawn: boolean
  spatial: boolean
  constructor (opts: JsonRecord = {}) {
    this.clipId = String(opts.clipId ?? opts.assetId ?? '')
    this.volume = Number(opts.volume) ?? 1
    this.loop = !!opts.loop
    this.playOnSpawn = !!opts.playOnSpawn
    this.spatial = !!opts.spatial
  }
  static fromJson (json: JsonRecord = {}): AudioSource {
    return new AudioSource(json)
  }
}

export class EntityTimer {
  slots: Record<string, TimerSlot>
  constructor (opts: JsonRecord = {}) {
    this.slots = {}
    if (opts.slots && typeof opts.slots === 'object') {
      for (const [k, v] of Object.entries(opts.slots as JsonRecord)) {
        const s = v as JsonRecord
        this.slots[k] = {
          duration: Number(s.duration) || 1,
          elapsed: Number(s.elapsed) || 0,
          repeating: !!s.repeating,
          active: s.active !== false
        }
      }
    }
  }
  static fromJson (json: JsonRecord = {}): EntityTimer {
    return new EntityTimer(json)
  }
}

export class Tags {
  list: string[]
  constructor (tags: unknown[] = []) {
    this.list = Array.isArray(tags) ? tags.map(String) : []
  }
  static fromJson (json: JsonRecord = {}): Tags {
    const t = json.tags ?? json.list
    return new Tags(Array.isArray(t) ? t : [])
  }
  has (tag: string): boolean {
    return this.list.includes(String(tag))
  }
}

export class Lifetime {
  remaining: number
  max: number
  destroyOnExpire: boolean
  constructor (opts: JsonRecord = {}) {
    this.remaining = Number(opts.remaining ?? opts.duration) || 0
    this.max = Number(opts.max ?? opts.remaining ?? opts.duration) || this.remaining
    this.destroyOnExpire = opts.destroyOnExpire !== false
  }
  static fromJson (json: JsonRecord = {}): Lifetime {
    return new Lifetime(json)
  }
}

export class TweenAnimation {
  playing: boolean
  clipId: string
  speed: number
  loop: boolean
  time: number
  constructor (opts: JsonRecord = {}) {
    this.playing = !!opts.playing
    this.clipId = String(opts.clipId ?? '')
    this.speed = Number(opts.speed) || 1
    this.loop = !!opts.loop
    this.time = Number(opts.time) || 0
  }
  static fromJson (json: JsonRecord = {}): TweenAnimation {
    return new TweenAnimation(json)
  }
}
