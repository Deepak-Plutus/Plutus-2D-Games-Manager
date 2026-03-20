import * as PIXI from 'pixi.js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { extractAssetUrls } from '../Definitions/extractAssets';
import { loadGame } from '../Definitions/loadGame';
import { RES_PIXI_APP } from './PixiAppSystem';

export type LoadingPhase = 'idle' | 'loading' | 'ready' | 'error';

export type LoadingState = {
  phase: LoadingPhase;
  progress01: number; // 0..1
  loaded: number;
  total: number;
  error?: string;
};

export const RES_GAME_DEF = 'game_def';
export const RES_LOADING = 'loading';
export const RES_LOADING_API = 'loading_api';

export type LoadingApi = {
  getState: () => LoadingState | undefined;
  isReady: () => boolean;
  restart: () => void;
};

/**
 * Loads assets referenced by the game definition, then spawns entities.
 * This keeps JSON-driven games deterministic: systems run, but entities appear only when ready.
 */
export class LoadingSystem extends System {
  private worldRef?: World;
  private started = false;
  private done = false;
  private promise?: Promise<void>;

  get singletonKey(): string {
    return 'LoadingSystem';
  }

  update(_dt: number, world: World): void {
    this.worldRef = world;
    if (this.done) return;

    let state = world.getResource<LoadingState>(RES_LOADING);
    if (!state) {
      state = { phase: 'idle', progress01: 0, loaded: 0, total: 0 };
      world.setResource(RES_LOADING, state);
    }
    if (!world.getResource<LoadingApi>(RES_LOADING_API)) {
      world.setResource(RES_LOADING_API, {
        getState: () => this.worldRef?.getResource<LoadingState>(RES_LOADING),
        isReady: () => this.worldRef?.getResource<LoadingState>(RES_LOADING)?.phase === 'ready',
        restart: () => this.restart(),
      });
    }

    if (!this.started) {
      const def = world.getResource<GameDefinition>(RES_GAME_DEF);
      const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
      if (!def || !app) return;

      this.started = true;
      state.phase = 'loading';

      const urls = extractAssetUrls(def);
      state.total = urls.length;

      this.promise = this.loadAll(urls, state)
        .then(() => {
          state.phase = 'ready';
          state.progress01 = 1;
          loadGame(def, world, app);
          this.done = true;
        })
        .catch((err) => {
          state.phase = 'error';
          state.error = err instanceof Error ? err.message : String(err);
          this.done = true;
        });
    }

    // promise progresses via PIXI.Assets.load callback, nothing to do per-frame here
    void this.promise;
  }

  private async loadAll(urls: string[], state: LoadingState): Promise<void> {
    if (urls.length === 0) {
      state.loaded = 0;
      state.total = 0;
      state.progress01 = 1;
      return;
    }

    // Load sequentially for predictable progress updates.
    // Can be swapped to parallel later (and still track progress).
    let loaded = 0;
    for (const url of urls) {
      await PIXI.Assets.load(url);
      loaded++;
      state.loaded = loaded;
      state.progress01 = loaded / urls.length;
    }
  }

  private restart(): void {
    if (!this.worldRef) return;
    const state = this.worldRef.getResource<LoadingState>(RES_LOADING);
    if (state) {
      state.phase = 'idle';
      state.progress01 = 0;
      state.loaded = 0;
      state.total = 0;
      state.error = undefined;
    }
    this.started = false;
    this.done = false;
    this.promise = undefined;
  }
}

