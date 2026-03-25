export class SpringPlatformComponent {
  private _jumpBoost: number;

  constructor(init?: Partial<SpringPlatformComponent>) {
    this._jumpBoost = init?.jumpBoost ?? 14;
  }

  get jumpBoost(): number {
    return this._jumpBoost;
  }
  set jumpBoost(value: number) {
    this._jumpBoost = value;
  }

  // Doc API alias
  setForce(v: number): void {
    if (!Number.isFinite(v)) return;
    this._jumpBoost = v;
  }

  // Doc API helper
  bounce(entity: { velocity?: { x: number; y: number } } | undefined): void {
    if (!entity?.velocity) return;
    entity.velocity.y = -Math.abs(this._jumpBoost);
  }
}
