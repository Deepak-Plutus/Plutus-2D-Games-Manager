export type SliderUiComponentProps = {
  key: string;
  min?: number;
  max?: number;
  value?: number;
  step?: number;
};

export class SliderUiComponent {
  static readonly type = "SliderUi";
  readonly type = SliderUiComponent.type;

  key: string;
  min: number;
  max: number;
  value: number;
  step: number;

  // runtime
  _attached?: boolean;
  _dragging?: boolean;
  _onChange: Array<(value: number) => void> = [];

  constructor(props: SliderUiComponentProps) {
    this.key = props.key;
    this.min = typeof props.min === "number" ? props.min : 0;
    this.max = typeof props.max === "number" ? props.max : 1;
    this.value = typeof props.value === "number" ? props.value : this.min;
    this.step = typeof props.step === "number" ? props.step : 0;
  }

  setValue(v: number): void {
    if (!Number.isFinite(v)) return;
    this.value = this.clampWithStep(v);
  }

  setRange(min: number, max: number): void {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    this.min = Math.min(min, max);
    this.max = Math.max(min, max);
    this.value = this.clampWithStep(this.value);
  }

  onChange(callback: (value: number) => void): void {
    if (typeof callback !== "function") return;
    this._onChange.push(callback);
  }

  offChange(callback: (value: number) => void): void {
    this._onChange = this._onChange.filter((fn) => fn !== callback);
  }

  emitChange(): void {
    for (const cb of this._onChange) cb(this.value);
  }

  clearChangeListeners(): void {
    this._onChange = [];
  }

  private clampWithStep(v: number): number {
    let next = v;
    if (this.step > 0) next = Math.round(next / this.step) * this.step;
    if (next < this.min) next = this.min;
    if (next > this.max) next = this.max;
    return next;
  }
}

