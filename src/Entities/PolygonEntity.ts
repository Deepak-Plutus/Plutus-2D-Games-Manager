import * as PIXI from "pixi.js";
import { EntityBase } from "./EntityBase";

export type PolygonEntityProps = {
  vertices: Array<[number, number]>;
  fill?: number;
  alpha?: number;
  lineColor?: number;
  lineWidth?: number;
};

export class PolygonEntity extends EntityBase {
  private _gfx: PIXI.Graphics;
  private _props: PolygonEntityProps;

  constructor(props: PolygonEntityProps) {
    const gfx = new PIXI.Graphics();
    super(gfx);
    this._gfx = gfx;
    this._props = props;
    this.redraw();
  }

  get gfx(): PIXI.Graphics {
    return this._gfx;
  }

  get props(): PolygonEntityProps {
    return this._props;
  }

  set props(value: PolygonEntityProps) {
    this._props = value;
    this.redraw();
  }

  private redraw(): void {
    const { vertices, fill = 0x60a5fa, alpha = 0.9, lineColor = 0x0b1220, lineWidth = 2 } = this._props;
    this._gfx.clear();

    if (!Array.isArray(vertices) || vertices.length < 3) return;

    const first = vertices[0];
    this._gfx.lineStyle(lineWidth, lineColor, 1);
    this._gfx.beginFill(fill, alpha);
    this._gfx.moveTo(first[0], first[1]);
    for (let i = 1; i < vertices.length; i++) {
      const v = vertices[i];
      this._gfx.lineTo(v[0], v[1]);
    }
    this._gfx.closePath();
    this._gfx.endFill();
  }
}

