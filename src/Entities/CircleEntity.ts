import * as PIXI from 'pixi.js';
import { EntityBase } from './EntityBase';

export type CircleEntityProps = {
  radius: number;
  fill?: number;
  alpha?: number;
};

export class CircleEntity extends EntityBase {
  private _gfx: PIXI.Graphics;
  private _props: CircleEntityProps;

  constructor(props: CircleEntityProps) {
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

  get props(): CircleEntityProps {
    return this._props;
  }

  set props(value: CircleEntityProps) {
    this._props = value;
  }

  redraw(): void {
    const { radius, fill = 0xffffff, alpha = 1 } = this._props;
    this._gfx.clear();
    this._gfx.circle(0, 0, radius);
    this._gfx.fill({ color: fill, alpha });
  }
}

