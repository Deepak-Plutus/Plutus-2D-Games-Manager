import * as PIXI from 'pixi.js';
import { EntityBase } from './EntityBase';

export type RectEntityProps = {
  width: number;
  height: number;
  fill?: number;
  alpha?: number;
  radius?: number;
  anchor?: { x: number; y: number }; // simulated by pivot
};

export class RectEntity extends EntityBase {
  private _gfx: PIXI.Graphics;
  private _props: RectEntityProps;

  constructor(props: RectEntityProps) {
    const gfx = new PIXI.Graphics();
    super(gfx);
    this._gfx = gfx;
    this._props = props;
    this.redraw();
  }

  get gfx(): PIXI.Graphics {
    return this._gfx;
  }

  set gfx(value: PIXI.Graphics) {
    this._gfx = value;
    this.view = value;
  }

  get props(): RectEntityProps {
    return this._props;
  }

  set props(value: RectEntityProps) {
    this._props = value;
  }

  redraw(): void {
    const { width, height, fill = 0xffffff, alpha = 1, radius = 0 } = this._props;
    this._gfx.clear();
    this._gfx.roundRect(0, 0, width, height, radius);
    this._gfx.fill({ color: fill, alpha });

    const anchor = this._props.anchor ?? { x: 0.5, y: 0.5 };
    this._gfx.pivot.set(width * anchor.x, height * anchor.y);
  }
}

