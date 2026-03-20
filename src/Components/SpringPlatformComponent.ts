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
}
