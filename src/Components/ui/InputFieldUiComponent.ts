export type InputFieldUiComponentProps = {
  key: string;
  value?: string;
  placeholder?: string;
  maxLength?: number;
};

export class InputFieldUiComponent {
  static readonly type = "InputFieldUi";
  readonly type = InputFieldUiComponent.type;

  key: string;
  value: string;
  placeholder: string;
  maxLength: number;

  // runtime
  _attached?: boolean;
  _onSubmit: Array<(value: string) => void> = [];

  constructor(props: InputFieldUiComponentProps) {
    this.key = props.key;
    this.value = typeof props.value === "string" ? props.value : "";
    this.placeholder = typeof props.placeholder === "string" ? props.placeholder : "";
    this.maxLength = typeof props.maxLength === "number" ? props.maxLength : 64;
  }

  setValue(text: string): void {
    const raw = text ?? "";
    this.value = raw.slice(0, Math.max(0, this.maxLength));
  }

  getValue(): string {
    return this.value;
  }

  onSubmit(callback: (value: string) => void): void {
    if (typeof callback !== "function") return;
    this._onSubmit.push(callback);
  }

  offSubmit(callback: (value: string) => void): void {
    this._onSubmit = this._onSubmit.filter((fn) => fn !== callback);
  }

  emitSubmit(): void {
    for (const cb of this._onSubmit) cb(this.value);
  }

  clearSubmitListeners(): void {
    this._onSubmit = [];
  }
}

