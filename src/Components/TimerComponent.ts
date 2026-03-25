import type { GameStateId } from "../Systems/StateManagementSystem";

export type TimerAction =
  | { type: "PlaySound"; soundId: string }
  | { type: "SetResource"; key: string; value: unknown }
  | { type: "TransitionState"; to: GameStateId | string; reason?: string }
  | { type: "DespawnSelf" };

export type TimerComponentProps = {
  durationMs: number;
  active?: boolean;
  repeat?: boolean;
  /**
   * If true, timer starts counting immediately when system first sees it.
   * Defaults to true.
   */
  startOnCreate?: boolean;
  /**
   * Actions executed when timer expires.
   */
  onExpire?: TimerAction[];
};

export class TimerComponent {
  static readonly type = "Timer";
  readonly type = TimerComponent.type;

  durationMs: number;
  active: boolean;
  repeat: boolean;
  startOnCreate: boolean;
  onExpire: TimerAction[];

  // runtime
  _started = false;
  _remainingMs = 0;

  constructor(props: TimerComponentProps) {
    this.durationMs = typeof props.durationMs === "number" ? props.durationMs : 0;
    this.active = props.active ?? true;
    this.repeat = props.repeat ?? false;
    this.startOnCreate = props.startOnCreate ?? true;
    this.onExpire = Array.isArray(props.onExpire) ? props.onExpire : [];
  }

  // ---- Doc-specified helper methods ----
  /**
   * start(time)
   * - Treats `time` as milliseconds.
   */
  start(timeMs: number): void {
    if (!Number.isFinite(timeMs) || timeMs < 0) return;
    this.durationMs = timeMs;
    this._remainingMs = timeMs;
    this._started = true;
    this.active = true;
  }

  stop(): void {
    this.active = false;
  }

  reset(): void {
    this._remainingMs = Math.max(0, this.durationMs);
    this._started = false;
    // keep active as-is; systems can decide whether to auto-start again
  }

  update(dtMs: number): void {
    if (!this.active) return;

    if (!this._started) {
      if (!this.startOnCreate) return;
      this._started = true;
      this._remainingMs = Math.max(0, this.durationMs);
    }

    this._remainingMs -= Math.max(0, dtMs);
    if (this._remainingMs < 0) this._remainingMs = 0;
  }

  isFinished(): boolean {
    return this._started && this._remainingMs <= 0;
  }

  restart(): void {
    this._remainingMs = Math.max(0, this.durationMs);
    this._started = true;
    this.active = true;
  }

  getRemainingMs(): number {
    return this._remainingMs;
  }

  getElapsedMs(): number {
    return Math.max(0, this.durationMs - this._remainingMs);
  }

  getProgress(): number {
    if (this.durationMs <= 0) return this.isFinished() ? 1 : 0;
    return Math.max(0, Math.min(1, this.getElapsedMs() / this.durationMs));
  }
}

