export class CollisionHarmComponent {
  private _damage: number;
  private _cooldownMs: number;

  // runtime
  private lastHitAtMs = -Infinity;

  constructor(init?: Partial<CollisionHarmComponent>) {
    this._damage = init?.damage ?? 10;
    this._cooldownMs = init?.cooldownMs ?? 500;
  }

  get damage(): number {
    return this._damage;
  }
  set damage(value: number) {
    this._damage = value;
  }

  get cooldownMs(): number {
    return this._cooldownMs;
  }
  set cooldownMs(value: number) {
    this._cooldownMs = value;
  }

  canHit(nowMs: number): boolean {
    return nowMs - this.lastHitAtMs >= this._cooldownMs;
  }

  markHit(nowMs: number): void {
    this.lastHitAtMs = nowMs;
  }

  setDamage(v: number): void {
    if (!Number.isFinite(v)) return;
    this._damage = Math.max(0, v);
  }

  applyDamage(entity: { hp?: number; takeDamage?: (v: number) => void } | undefined): void {
    if (!entity) return;
    if (typeof entity.takeDamage === 'function') {
      entity.takeDamage(this._damage);
      return;
    }
    if (typeof entity.hp === 'number') {
      entity.hp = Math.max(0, entity.hp - this._damage);
    }
  }
}

