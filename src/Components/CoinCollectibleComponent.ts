export class CoinCollectibleComponent {
  private _value: number;
  private _collected = false;
  private _destroyed = false;
  private _scoreAdded = 0;

  constructor(init?: Partial<CoinCollectibleComponent>) {
    this._value = init?.value ?? 1;
  }

  get value(): number {
    return this._value;
  }
  set value(v: number) {
    this._value = v;
  }

  // ---- Doc-specified helpers ----
  collect(player: any): void {
    this._collected = true;

    // Keep the component side effect small: allow a player object to optionally
    // receive score directly (if it exposes addScore), otherwise the owning system
    // (CoinCollectionSystem) handles global score state.
    if (player && typeof player.addScore === "function") {
      player.addScore(Math.max(1, Math.floor(this._value)));
    }
  }

  addScore(value: number): void {
    const v = Number.isFinite(value) ? value : 0;
    this._scoreAdded += v;
  }

  destroy(): void {
    this._destroyed = true;
  }

  reset(): void {
    this._collected = false;
    this._destroyed = false;
    this._scoreAdded = 0;
  }

  canCollect(): boolean {
    return !this._collected && !this._destroyed;
  }

  // optional inspection/debugging
  get collected(): boolean {
    return this._collected;
  }

  get destroyed(): boolean {
    return this._destroyed;
  }

  get scoreAdded(): number {
    return this._scoreAdded;
  }
}
