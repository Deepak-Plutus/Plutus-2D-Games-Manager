import type * as PIXI from "pixi.js";

export type TextUiComponentProps = {
  text?: string;
  /**
   * Optional binding key. If set, UiSystem will read `ui.values[key]`
   * and render it (stringified) when present.
   */
  key?: string;
  prefix?: string;
  suffix?: string;
  style?: Partial<PIXI.TextStyle>;
};

export class TextUiComponent {
  static readonly type = "TextUi";
  readonly type = TextUiComponent.type;

  text: string;
  key?: string;
  prefix: string;
  suffix: string;
  style?: Partial<PIXI.TextStyle>;

  constructor(props: TextUiComponentProps = {}) {
    this.text = props.text ?? "";
    this.key = typeof props.key === "string" ? props.key : undefined;
    this.prefix = props.prefix ?? "";
    this.suffix = props.suffix ?? "";
    this.style = props.style;
  }

  setText(value: string): void {
    this.text = value ?? "";
  }

  setFontSize(size: number): void {
    if (!Number.isFinite(size) || size <= 0) return;
    this.style = { ...(this.style ?? {}), fontSize: size };
  }

  setColor(color: number | string): void {
    this.style = { ...(this.style ?? {}), fill: color as any };
  }
}

