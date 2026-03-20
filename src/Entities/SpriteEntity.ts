import * as PIXI from 'pixi.js';
import { EntityBase } from './EntityBase';

export type SpriteEntityProps = {
  texture?: PIXI.Texture;
  tint?: number;
  width?: number;
  height?: number;
  anchor?: { x: number; y: number };
};

export class SpriteEntity extends EntityBase {
  private _sprite: PIXI.Sprite;

  constructor(props: SpriteEntityProps = {}) {
    const sprite = new PIXI.Sprite(props.texture ?? PIXI.Texture.WHITE);
    super(sprite);
    this._sprite = sprite;

    if (props.tint !== undefined) this._sprite.tint = props.tint;
    if (props.width !== undefined) this._sprite.width = props.width;
    if (props.height !== undefined) this._sprite.height = props.height;
    if (props.anchor) this._sprite.anchor.set(props.anchor.x, props.anchor.y);
  }

  get sprite(): PIXI.Sprite {
    return this._sprite;
  }

  set sprite(value: PIXI.Sprite) {
    this._sprite = value;
    this.view = value;
  }
}

