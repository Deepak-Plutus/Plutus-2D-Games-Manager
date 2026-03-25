export type ButtonUiComponentProps = {
  /**
   * Optional binding key. When set, UiSystem will store click counts / events if desired.
   */
  key?: string;
  label?: string;
  enabled?: boolean;
};

export class ButtonUiComponent {
  static readonly type = "ButtonUi";
  readonly type = ButtonUiComponent.type;

  key?: string;
  label: string;
  enabled: boolean;

  // runtime
  _attached?: boolean;
  _onClick: Array<() => void> = [];

  constructor(props: ButtonUiComponentProps = {}) {
    this.key = typeof props.key === "string" ? props.key : undefined;
    this.label = props.label ?? "Button";
    this.enabled = props.enabled ?? true;
  }

  onClick(callback: () => void): void {
    if (typeof callback !== "function") return;
    this._onClick.push(callback);
  }

  offClick(callback: () => void): void {
    this._onClick = this._onClick.filter((fn) => fn !== callback);
  }

  setEnabled(v: boolean): void {
    this.enabled = !!v;
  }

  setLabel(text: string): void {
    this.label = text ?? "";
  }

  emitClick(): void {
    for (const cb of this._onClick) cb();
  }

  clearClickListeners(): void {
    this._onClick = [];
  }
}

