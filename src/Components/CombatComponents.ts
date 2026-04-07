type JsonRecord = Record<string, unknown>

/**
 * Health pool component.
 */
export class Health {
  current: number
  max: number

  constructor (opts: JsonRecord = {}) {
    this.current = Number(opts.current ?? opts.hp ?? 100)
    this.max = Number(opts.max ?? opts.maximum ?? this.current)
  }

  /**
   * Parses health values from JSON.
   *
   * @param {JsonRecord} json Raw health block.
   * @returns {Health}
   */
  static fromJson (json: JsonRecord = {}): Health {
    return new Health(json)
  }
}

/**
 * Damage payload component.
 */
export class Damage {
  amount: number
  type: string
  knockback: number

  constructor (opts: JsonRecord = {}) {
    this.amount = Number(opts.amount ?? opts.value) || 0
    this.type = String(opts.type ?? 'default')
    this.knockback = Number(opts.knockback) || 0
  }

  /**
   * Parses damage values from JSON.
   *
   * @param {JsonRecord} json Raw damage block.
   * @returns {Damage}
   */
  static fromJson (json: JsonRecord = {}): Damage {
    return new Damage(json)
  }
}

/**
 * Armor/mitigation component.
 */
export class Armor {
  value: number
  type: string

  constructor (opts: JsonRecord = {}) {
    this.value = Number(opts.value ?? opts.armor) || 0
    this.type = String(opts.type ?? 'flat')
  }

  /**
   * Parses armor values from JSON.
   *
   * @param {JsonRecord} json Raw armor block.
   * @returns {Armor}
   */
  static fromJson (json: JsonRecord = {}): Armor {
    return new Armor(json)
  }
}

/**
 * Collectible item state component.
 */
export class Collectible {
  kind: string
  scoreValue: number
  pickedUp: boolean

  constructor (opts: JsonRecord = {}) {
    this.kind = String(opts.kind ?? 'generic')
    this.scoreValue = Number(opts.scoreValue) || 0
    this.pickedUp = !!opts.pickedUp
  }

  /**
   * Parses collectible values from JSON.
   *
   * @param {JsonRecord} json Raw collectible block.
   * @returns {Collectible}
   */
  static fromJson (json: JsonRecord = {}): Collectible {
    return new Collectible(json)
  }
}

/**
 * Score tracker component.
 */
export class Score {
  value: number
  highScore: number

  constructor (opts: JsonRecord = {}) {
    this.value = Number(opts.value ?? opts.score) || 0
    this.highScore = Number(opts.highScore) || 0
  }

  /**
   * Parses score values from JSON.
   *
   * @param {JsonRecord} json Raw score block.
   * @returns {Score}
   */
  static fromJson (json: JsonRecord = {}): Score {
    return new Score(json)
  }
}
