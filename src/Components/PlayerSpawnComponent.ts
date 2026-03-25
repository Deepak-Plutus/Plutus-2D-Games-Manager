export type PlayerSpawnComponentProps = {
  /**
   * Optional: entity prefab/type to spawn at this point.
   * Stored only; spawn logic is up to game systems.
   */
  prefab?: string;
  /**
   * Optional checkpoint id or slot.
   */
  slot?: number;
  spawnPoint?: { x: number; y: number };
};

export class PlayerSpawnComponent {
  static readonly type = "PlayerSpawn";
  readonly type = PlayerSpawnComponent.type;

  prefab?: string;
  slot?: number;
  spawnPoint?: { x: number; y: number };

  // runtime
  _spawnRequested = false;

  constructor(init?: Partial<PlayerSpawnComponentProps>) {
    this.prefab = typeof init?.prefab === "string" ? init.prefab : undefined;
    this.slot = typeof init?.slot === "number" ? init.slot : undefined;
    this.spawnPoint = init?.spawnPoint ? { x: init.spawnPoint.x, y: init.spawnPoint.y } : undefined;
  }

  spawnPlayer(): void {
    this._spawnRequested = true;
  }

  requestSpawn(): void {
    this.spawnPlayer();
  }

  setSpawnPoint(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.spawnPoint = { x, y };
  }

  hasPendingSpawn(): boolean {
    return this._spawnRequested;
  }

  consumeSpawnRequest(): boolean {
    const v = this._spawnRequested;
    this._spawnRequested = false;
    return v;
  }

  clearSpawnRequest(): void {
    this._spawnRequested = false;
  }

  resetSpawnPoint(): void {
    this.spawnPoint = undefined;
  }
}

