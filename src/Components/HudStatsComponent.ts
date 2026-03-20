export class HudStatsComponent {
  private _targetId: string;
  private _showHealth: boolean;
  private _showCoins: boolean;

  constructor(init?: Partial<HudStatsComponent>) {
    this._targetId = init?.targetId ?? 'hero';
    this._showHealth = init?.showHealth ?? true;
    this._showCoins = init?.showCoins ?? true;
  }

  get targetId(): string {
    return this._targetId;
  }
  set targetId(value: string) {
    this._targetId = value;
  }

  get showHealth(): boolean {
    return this._showHealth;
  }
  set showHealth(value: boolean) {
    this._showHealth = value;
  }

  get showCoins(): boolean {
    return this._showCoins;
  }
  set showCoins(value: boolean) {
    this._showCoins = value;
  }
}
