import type { EntityDefinition } from '../Definitions/GameDefinition';

export type PlatformSpawnerComponentProps = {
  template?: EntityDefinition;
  cooldownMs?: number;
  maxAlive?: number;
  spawnedPrefix?: string;
  elapsedMs?: number;
  counter?: number;
};

export class PlatformSpawnerComponent {
  private _template?: EntityDefinition;
  private _cooldownMs: number;
  private _maxAlive: number;
  private _spawnedPrefix: string;
  private _elapsedMs: number;
  private _counter: number;
  private _spawnRequested = false;

  constructor(init?: PlatformSpawnerComponentProps) {
    this._template = init?.template;
    this._cooldownMs = init?.cooldownMs ?? 4000;
    this._maxAlive = init?.maxAlive ?? 3;
    this._spawnedPrefix = init?.spawnedPrefix ?? 'spawned';
    this._elapsedMs = init?.elapsedMs ?? 0;
    this._counter = init?.counter ?? 0;
  }

  get template(): EntityDefinition | undefined {
    return this._template;
  }
  set template(value: EntityDefinition | undefined) {
    this._template = value;
  }

  get cooldownMs(): number {
    return this._cooldownMs;
  }
  set cooldownMs(value: number) {
    this._cooldownMs = value;
  }

  get maxAlive(): number {
    return this._maxAlive;
  }
  set maxAlive(value: number) {
    this._maxAlive = value;
  }

  get spawnedPrefix(): string {
    return this._spawnedPrefix;
  }
  set spawnedPrefix(value: string) {
    this._spawnedPrefix = value;
  }

  get elapsedMs(): number {
    return this._elapsedMs;
  }
  set elapsedMs(value: number) {
    this._elapsedMs = value;
  }

  get counter(): number {
    return this._counter;
  }
  set counter(value: number) {
    this._counter = value;
  }

  get spawnRequested(): boolean {
    return this._spawnRequested;
  }
  set spawnRequested(value: boolean) {
    this._spawnRequested = value;
  }

  // Doc API: spawnPlatform()
  spawnPlatform(): void {
    this._spawnRequested = true;
  }

  requestSpawnNow(): void {
    this.spawnPlatform();
  }

  // Doc API: setSpawnRate(rate)
  // rate = spawns per second
  setSpawnRate(rate: number): void {
    if (!Number.isFinite(rate) || rate < 0) return;
    this._cooldownMs = rate > 0 ? 1000 / rate : Number.POSITIVE_INFINITY;
  }

  consumeSpawnRequest(): boolean {
    const v = this._spawnRequested;
    this._spawnRequested = false;
    return v;
  }

  hasPendingSpawn(): boolean {
    return this._spawnRequested;
  }

  resetSpawner(): void {
    this._elapsedMs = 0;
    this._spawnRequested = false;
  }
}
