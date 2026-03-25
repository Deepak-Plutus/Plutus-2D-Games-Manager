export type AnimationStateConfig = {
  idle?: string;
  run?: string;
};

/**
 * Placeholder animation component.
 * Right now we store animation clip IDs from JSON.
 * A future AnimationSystem can map these clip IDs to spritesheets/frames.
 */
export class AnimationStateComponent {
  private _idle: string;
  private _run: string;
  private _current: 'idle' | 'run';

  constructor(init?: AnimationStateConfig) {
    this._idle = init?.idle ?? 'idle';
    this._run = init?.run ?? 'run';
    this._current = 'idle';
  }

  get idle(): string {
    return this._idle;
  }
  set idle(value: string) {
    this._idle = value;
  }

  get run(): string {
    return this._run;
  }
  set run(value: string) {
    this._run = value;
  }

  get current(): 'idle' | 'run' {
    return this._current;
  }
  set current(value: 'idle' | 'run') {
    this._current = value;
  }

  setState(name: 'idle' | 'run'): void {
    this._current = name;
  }

  getState(): 'idle' | 'run' {
    return this._current;
  }

  transitionTo(name: 'idle' | 'run'): void {
    this._current = name;
  }

  setClips(idle: string, run: string): void {
    this._idle = idle;
    this._run = run;
  }

  getClipForCurrentState(): string {
    return this._current === 'run' ? this._run : this._idle;
  }

  isState(name: 'idle' | 'run'): boolean {
    return this._current === name;
  }

  updateState(_dtMs: number): void {
    // State transition policy is system-driven.
  }
}

