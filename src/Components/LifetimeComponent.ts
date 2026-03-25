export type LifetimeComponentProps = {
  /**
   * Lifetime in seconds (doc naming).
   */
  lifetimeSeconds?: number;
  /**
   * Alias for JSON friendliness.
   */
  lifetime?: number;
  /**
   * Start active by default.
   */
  active?: boolean;
  /**
   * Whether entity should be destroyed when expired.
   */
  autoDestroy?: boolean;
};

export class LifetimeComponent {
  static readonly type = "Lifetime";
  readonly type = LifetimeComponent.type;

  lifetimeSeconds: number;
  active: boolean;
  autoDestroy: boolean;

  // runtime
  _remainingSeconds: number;
  _expired = false;
  _destroyOnExpire = false;

  constructor(props: LifetimeComponentProps = {}) {
    const secondsRaw =
      typeof props.lifetimeSeconds === "number"
        ? props.lifetimeSeconds
        : typeof props.lifetime === "number"
          ? props.lifetime
          : 0;
    this.lifetimeSeconds = Math.max(0, secondsRaw);
    this.active = props.active ?? true;
    this.autoDestroy = props.autoDestroy ?? true;
    this._remainingSeconds = this.lifetimeSeconds;
  }

  setLifetime(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    this.lifetimeSeconds = seconds;
    this._remainingSeconds = seconds;
    this._expired = false;
    this._destroyOnExpire = false;
  }

  updateLifetime(dtMs: number): void {
    if (!this.active || this._expired) return;
    const dtSeconds = Math.max(0, dtMs) / 1000;
    this._remainingSeconds -= dtSeconds;
    if (this._remainingSeconds <= 0) {
      this._remainingSeconds = 0;
      this._expired = true;
      this.active = false;
      if (this.autoDestroy) this._destroyOnExpire = true;
    }
  }

  destroyWhenExpired(): boolean {
    return this._destroyOnExpire;
  }
}

