import * as PIXI from "pixi.js";
import { EntityBase } from "./EntityBase";

export type TextEntityProps = {
  text?: string;
  style?: Partial<PIXI.TextStyle>;
  anchor?: { x: number; y: number };
};

export class TextEntity extends EntityBase {
  private _text: PIXI.Text;

  constructor(props: TextEntityProps = {}) {
    const t = new PIXI.Text({
      text: props.text ?? "",
      style: {
        fontFamily: "system-ui, Segoe UI, Roboto, sans-serif",
        fontSize: 16,
        fill: 0xffffff,
        ...props.style,
      },
    });
    super(t);
    this._text = t;
    if (props.anchor) this._text.anchor.set(props.anchor.x, props.anchor.y);
  }

  get text(): PIXI.Text {
    return this._text;
  }
}

