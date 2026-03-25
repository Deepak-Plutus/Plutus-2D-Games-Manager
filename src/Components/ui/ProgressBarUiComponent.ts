export type ProgressBarUiComponentProps = {
  key: string;
  min?: number;
  max?: number;
  value?: number;
  showText?: boolean;
  decimals?: number;
};

export class ProgressBarUiComponent {
  static readonly type = "ProgressBarUi";
  readonly type = ProgressBarUiComponent.type;

  key: string;
  min: number;
  max: number;
  value: number;
  showText: boolean;
  decimals: number;

  // runtime animation state
  _animFrom?: number;
  _animTo?: number;
  _animDurationMs?: number;
  _animElapsedMs?: number;

  constructor(props: ProgressBarUiComponentProps) {
    this.key = props.key;
    this.min = typeof props.min === "number" ? props.min : 0;
    this.max = typeof props.max === "number" ? props.max : 100;
    this.value = typeof props.value === "number" ? props.value : this.max;
    this.showText = typeof props.showText === "boolean" ? props.showText : false;
    this.decimals = typeof props.decimals === "number" ? props.decimals : 0;
  }

  setValue(v: number): void {
    if (!Number.isFinite(v)) return;
    this.value = v;
  }

  setMax(v: number): void {
    if (!Number.isFinite(v)) return;
    this.max = v;
  }

  animateTo(v: number, durationMs: number): void {
    if (!Number.isFinite(v) || !Number.isFinite(durationMs)) return;
    this._animFrom = this.value;
    this._animTo = v;
    this._animDurationMs = Math.max(0, durationMs);
    this._animElapsedMs = 0;
    if (this._animDurationMs === 0) {
      this.value = v;
      this._animFrom = undefined;
      this._animTo = undefined;
      this._animDurationMs = undefined;
      this._animElapsedMs = undefined;
    }
  }
}

