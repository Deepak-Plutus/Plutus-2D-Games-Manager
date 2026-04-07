type JsonRecord = Record<string, unknown>

export class Health {
  current: number
  max: number

  constructor (opts: JsonRecord = {}) {
    this.current = Number(opts.current ?? opts.hp ?? 100)
    this.max = Number(opts.max ?? opts.maximum ?? this.current)
  }

  static fromJson (json: JsonRecord = {}): Health {
    return new Health(json)
  }
}

export class Damage {
  amount: number
  type: string
  knockback: number

  constructor (opts: JsonRecord = {}) {
    this.amount = Number(opts.amount ?? opts.value) || 0
    this.type = String(opts.type ?? 'default')
    this.knockback = Number(opts.knockback) || 0
  }

  static fromJson (json: JsonRecord = {}): Damage {
    return new Damage(json)
  }
}

export class Armor {
  value: number
  type: string

  constructor (opts: JsonRecord = {}) {
    this.value = Number(opts.value ?? opts.armor) || 0
    this.type = String(opts.type ?? 'flat')
  }

  static fromJson (json: JsonRecord = {}): Armor {
    return new Armor(json)
  }
}

export class Collectible {
  kind: string
  scoreValue: number
  pickedUp: boolean

  constructor (opts: JsonRecord = {}) {
    this.kind = String(opts.kind ?? 'generic')
    this.scoreValue = Number(opts.scoreValue) || 0
    this.pickedUp = !!opts.pickedUp
  }

  static fromJson (json: JsonRecord = {}): Collectible {
    return new Collectible(json)
  }
}

export class Score {
  value: number
  highScore: number

  constructor (opts: JsonRecord = {}) {
    this.value = Number(opts.value ?? opts.score) || 0
    this.highScore = Number(opts.highScore) || 0
  }

  static fromJson (json: JsonRecord = {}): Score {
    return new Score(json)
  }
}
