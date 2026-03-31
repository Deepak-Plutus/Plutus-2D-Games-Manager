/**
 * Health, damage, armor, collectible, score.
 */
export class Health {
  constructor(opts = {}) {
    this.current = Number(opts.current ?? opts.hp ?? 100);
    this.max = Number(opts.max ?? opts.maximum ?? this.current);
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Health(json);
  }
}

export class Damage {
  constructor(opts = {}) {
    this.amount = Number(opts.amount ?? opts.value) || 0;
    this.type = String(opts.type ?? 'default');
    this.knockback = Number(opts.knockback) || 0;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Damage(json);
  }
}

export class Armor {
  constructor(opts = {}) {
    this.value = Number(opts.value ?? opts.armor) || 0;
    this.type = String(opts.type ?? 'flat');
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Armor(json);
  }
}

export class Collectible {
  constructor(opts = {}) {
    this.kind = String(opts.kind ?? 'generic');
    this.scoreValue = Number(opts.scoreValue) || 0;
    this.pickedUp = !!opts.pickedUp;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Collectible(json);
  }
}

export class Score {
  constructor(opts = {}) {
    this.value = Number(opts.value ?? opts.score) || 0;
    this.highScore = Number(opts.highScore) || 0;
  }

  /**
   * @param {Record<string, unknown>} [json]
   */
  static fromJson(json = {}) {
    return new Score(json);
  }
}
