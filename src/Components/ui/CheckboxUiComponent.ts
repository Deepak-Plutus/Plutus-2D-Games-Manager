export type CheckboxUiComponentProps = {
  key: string;
  checked?: boolean;
};

export class CheckboxUiComponent {
  static readonly type = "CheckboxUi";
  readonly type = CheckboxUiComponent.type;

  key: string;
  checked: boolean;

  // runtime
  _attached?: boolean;
  _onChange: Array<(checked: boolean) => void> = [];

  constructor(props: CheckboxUiComponentProps) {
    this.key = props.key;
    this.checked = typeof props.checked === "boolean" ? props.checked : false;
  }

  setChecked(v: boolean): void {
    this.checked = !!v;
  }

  toggle(): void {
    this.checked = !this.checked;
  }

  onChange(callback: (checked: boolean) => void): void {
    if (typeof callback !== "function") return;
    this._onChange.push(callback);
  }

  offChange(callback: (checked: boolean) => void): void {
    this._onChange = this._onChange.filter((fn) => fn !== callback);
  }

  emitChange(): void {
    for (const cb of this._onChange) cb(this.checked);
  }

  clearChangeListeners(): void {
    this._onChange = [];
  }
}

