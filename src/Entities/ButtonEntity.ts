import * as PIXI from 'pixi.js';
import { EntityBase } from './EntityBase';

export type ButtonEntityProps = {
  width: number;
  height: number;
  label?: string;
  fill?: number;
  hoverFill?: number;
  textColor?: number;
};

export class ButtonEntity extends EntityBase {
  private _container: PIXI.Container;
  private _bg: PIXI.Graphics;
  private _text: PIXI.Text;
  private _props: ButtonEntityProps;

  constructor(props: ButtonEntityProps) {
    const container = new PIXI.Container();
    super(container);
    this._container = container;
    this._props = props;

    this._bg = new PIXI.Graphics();
    this._text = new PIXI.Text({
      text: props.label ?? 'Button',
      style: {
        fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
        fontSize: 14,
        fill: props.textColor ?? 0xffffff,
      },
    });

    this._container.addChild(this._bg);
    this._container.addChild(this._text);
    this.redraw(props.fill ?? 0x111827);

    this._container.eventMode = 'static';
    this._container.cursor = 'pointer';

    this._container.on('pointerover', () => this.redraw(props.hoverFill ?? 0x1f2937));
    this._container.on('pointerout', () => this.redraw(props.fill ?? 0x111827));
  }

  get container(): PIXI.Container {
    return this._container;
  }

  get bg(): PIXI.Graphics {
    return this._bg;
  }

  get text(): PIXI.Text {
    return this._text;
  }

  get props(): ButtonEntityProps {
    return this._props;
  }

  set props(value: ButtonEntityProps) {
    this._props = value;
  }

  onClick(handler: () => void): void {
    this._container.on('pointertap', handler);
  }

  private redraw(fill: number): void {
    const { width, height } = this._props;
    this._bg.clear();
    this._bg.roundRect(0, 0, width, height, 10);
    this._bg.fill({ color: fill, alpha: 0.9 });
    this._bg.pivot.set(width / 2, height / 2);

    this._text.anchor.set(0.5, 0.5);
    this._text.position.set(0, 0);
  }
}

