export class HudStatsComponent {
  private _targetId: string;
  private _showHealth: boolean;
  private _showCoins: boolean;
  private _showEnemyCount: boolean;
  private _showScore: boolean;
  private _enemyPrefix: string;

  constructor(init?: Partial<HudStatsComponent>) {
    this._targetId = init?.targetId ?? 'hero';
    this._showHealth = init?.showHealth ?? true;
    this._showCoins = init?.showCoins ?? true;
    this._showEnemyCount = init?.showEnemyCount ?? false;
    this._showScore = init?.showScore ?? false;
    this._enemyPrefix = init?.enemyPrefix ?? 'enemy_';
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

  get showEnemyCount(): boolean {
    return this._showEnemyCount;
  }
  set showEnemyCount(value: boolean) {
    this._showEnemyCount = value;
  }

  get showScore(): boolean {
    return this._showScore;
  }
  set showScore(value: boolean) {
    this._showScore = value;
  }

  get enemyPrefix(): string {
    return this._enemyPrefix;
  }
  set enemyPrefix(value: string) {
    this._enemyPrefix = value;
  }
}
