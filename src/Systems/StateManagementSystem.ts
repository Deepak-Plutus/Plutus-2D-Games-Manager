import { System } from '../Core/System';
import type { World } from '../Core/World';
import type { LoadingState } from './LoadingSystem';
import { RES_LOADING } from './LoadingSystem';
import type { InputState } from './InputSystem';
import { RES_INPUT } from './InputSystem';

export type GameStateId = 'boot' | 'loading' | 'menu' | 'playing' | 'paused' | 'error';

export type StateResource = {
  current: GameStateId;
  previous?: GameStateId;
  timeInStateMs: number;
  lastTransitionReason?: string;
};

export const RES_STATE = 'state';
export const RES_STATE_API = 'state_api';

export type StateApi = {
  getCurrent: () => GameStateId | undefined;
  getPrevious: () => GameStateId | undefined;
  transition: (next: GameStateId, reason?: string) => void;
  is: (state: GameStateId) => boolean;
};

/**
 * Minimal finite state machine:
 * - boot -> loading (immediately)
 * - loading -> playing when LoadingSystem reports ready
 * - any -> paused (Esc)
 * - paused -> playing (Esc)
 * - loading -> error if LoadingSystem error
 */
export class StateManagementSystem extends System {
  private worldRef?: World;
  private escWasDown = false;

  get singletonKey(): string {
    return 'StateManagementSystem';
  }

  update(dt: number, world: World): void {
    this.worldRef = world;
    let state = world.getResource<StateResource>(RES_STATE);
    if (!state) {
      state = { current: 'boot', timeInStateMs: 0 };
      world.setResource(RES_STATE, state);
    }
    if (!world.getResource<StateApi>(RES_STATE_API)) {
      world.setResource(RES_STATE_API, {
        getCurrent: () => this.worldRef?.getResource<StateResource>(RES_STATE)?.current,
        getPrevious: () => this.worldRef?.getResource<StateResource>(RES_STATE)?.previous,
        transition: (next: GameStateId, reason = 'api_transition') => this.transitionTo(next, reason),
        is: (s: GameStateId) => this.worldRef?.getResource<StateResource>(RES_STATE)?.current === s,
      });
    }

    state.timeInStateMs += dt;

    // Boot transitions immediately to loading
    if (state.current === 'boot') {
      this.transition(state, 'loading', 'boot_complete');
    }

    // Sync with loading
    const loading = world.getResource<LoadingState>(RES_LOADING);
    if (state.current === 'loading' && loading) {
      if (loading.phase === 'ready') this.transition(state, 'playing', 'assets_ready');
      if (loading.phase === 'error') this.transition(state, 'error', loading.error ?? 'loading_error');
    }

    // Pause toggle via Esc
    const input = world.getResource<InputState>(RES_INPUT);
    const escDown = input?.keysDown.has('Escape') ?? false;
    const escJustPressed = escDown && !this.escWasDown;
    this.escWasDown = escDown;

    if (escJustPressed) {
      if (state.current === 'paused') this.transition(state, 'playing', 'esc_unpause');
      else if (state.current === 'playing') this.transition(state, 'paused', 'esc_pause');
    }
  }

  private transition(state: StateResource, next: GameStateId, reason: string): void {
    if (state.current === next) return;
    state.previous = state.current;
    state.current = next;
    state.timeInStateMs = 0;
    state.lastTransitionReason = reason;
  }

  private transitionTo(next: GameStateId, reason: string): void {
    const state = this.worldRef?.getResource<StateResource>(RES_STATE);
    if (!state) return;
    this.transition(state, next, reason);
  }
}

