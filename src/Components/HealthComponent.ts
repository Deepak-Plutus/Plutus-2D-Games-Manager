export class HealthComponent {
  private _hp: number;
  private _maxHp: number;

  constructor(init?: Partial<HealthComponent>) {
    this._maxHp = init?.maxHp ?? init?.hp ?? 100;
    this._hp = init?.hp ?? this._maxHp;
  }

  get hp(): number {
    return this._hp;
  }

  set hp(value: number) {
    this._hp = Math.max(0, Math.min(value, this._maxHp));
  }

  get maxHp(): number {
    return this._maxHp;
  }

  set maxHp(value: number) {
    this._maxHp = Math.max(1, value);
    if (this._hp > this._maxHp) this._hp = this._maxHp;
  }
}

