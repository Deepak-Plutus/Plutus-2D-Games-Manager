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

  // ---- Doc-specified helper methods ----
  setMaxHealth(v: number): void {
    if (!Number.isFinite(v)) return;
    this.maxHp = v;
  }

  setHealth(v: number): void {
    if (!Number.isFinite(v)) return;
    this.hp = v;
  }

  getHealth(): number {
    return this._hp;
  }

  getMaxHealth(): number {
    return this._maxHp;
  }

  takeDamage(v: number): void {
    if (!Number.isFinite(v) || v <= 0) return;
    this.hp = this._hp - v;
  }

  heal(v: number): void {
    if (!Number.isFinite(v) || v <= 0) return;
    this.hp = this._hp + v;
  }

  fullHeal(): void {
    this.hp = this._maxHp;
  }

  revive(health: number = 1): void {
    if (!Number.isFinite(health)) return;
    this.hp = Math.max(1, Math.floor(health));
  }

  isDead(): boolean {
    return this._hp <= 0;
  }

  isAlive(): boolean {
    return this._hp > 0;
  }

  getHealthPercent(): number {
    if (this._maxHp <= 0) return 0;
    return Math.max(0, Math.min(1, this._hp / this._maxHp));
  }
}

