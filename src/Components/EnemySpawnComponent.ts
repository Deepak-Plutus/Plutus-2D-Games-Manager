export type EnemySpawnComponentProps = {
  prefab?: string;
  /**
   * Optional lane/slot index so wave systems can spawn deterministically.
   */
  slot?: number;
  intervalSec?: number;
};

export class EnemySpawnComponent {
  static readonly type = "EnemySpawn";
  readonly type = EnemySpawnComponent.type;

  prefab?: string;
  slot?: number;
  intervalSec: number;

  // runtime
  _elapsedSec = 0;
  _spawnRequestCount = 0;
  _pendingType?: string;

  constructor(init?: Partial<EnemySpawnComponentProps>) {
    this.prefab = typeof init?.prefab === "string" ? init.prefab : undefined;
    this.slot = typeof init?.slot === "number" ? init.slot : undefined;
    this.intervalSec = typeof init?.intervalSec === "number" ? Math.max(0, init.intervalSec) : 0;
  }

  spawnEnemy(type: string): void {
    this._pendingType = type || this.prefab;
    this._spawnRequestCount += 1;
  }

  setInterval(sec: number): void {
    if (!Number.isFinite(sec)) return;
    this.intervalSec = Math.max(0, sec);
    this._elapsedSec = 0;
  }

  resetSpawner(): void {
    this._elapsedSec = 0;
    this._spawnRequestCount = 0;
    this._pendingType = undefined;
  }

  updateSpawner(dtMs: number): void {
    if (this.intervalSec <= 0) return;
    this._elapsedSec += Math.max(0, dtMs) / 1000;
    if (this._elapsedSec < this.intervalSec) return;
    this._elapsedSec = 0;
    this.spawnEnemy(this.prefab ?? "Enemy");
  }

  hasPendingSpawn(): boolean {
    return this._spawnRequestCount > 0;
  }

  consumeSpawnRequest(): { type?: string } | undefined {
    if (this._spawnRequestCount <= 0) return undefined;
    this._spawnRequestCount = Math.max(0, this._spawnRequestCount - 1);
    return { type: this._pendingType };
  }

  clearPendingSpawns(): void {
    this._spawnRequestCount = 0;
  }
}

