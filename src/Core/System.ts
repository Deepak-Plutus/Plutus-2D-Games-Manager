import type { World } from './World.ts';

export abstract class System {
  private _enabled = true;

  /**
   * Optional singleton key.
   * If provided, World keeps a unique instance under this key.
   */
  get singletonKey(): string | undefined {
    return undefined;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  /**
   * Called once when added to the World.
   * Override in derived systems when needed.
   */
  onAdded(_world: World): void {}

  /**
   * Called once when removed from the World.
   * Override in derived systems when needed.
   */
  onRemoved(_world: World): void {}

  abstract update(dt: number, world: World): void;
}

