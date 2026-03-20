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
}

