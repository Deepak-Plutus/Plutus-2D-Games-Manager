import * as PIXI from "pixi.js";
import { EntityBase } from "./EntityBase";

export type AnimatedSpriteEntityProps = {
  textures: PIXI.Texture[];
  width?: number;
  height?: number;
  anchor?: { x: number; y: number };
  animationSpeed?: number; // frames per tick (Pixi convention)
  loop?: boolean;
  playing?: boolean;
};

export class AnimatedSpriteEntity extends EntityBase {
  private _sprite: PIXI.AnimatedSprite;

  constructor(props: AnimatedSpriteEntityProps) {
    const sprite = new PIXI.AnimatedSprite(props.textures);
    super(sprite);
    this._sprite = sprite;

    if (props.anchor) sprite.anchor.set(props.anchor.x, props.anchor.y);
    if (typeof props.width === "number") sprite.width = props.width;
    if (typeof props.height === "number") sprite.height = props.height;
    if (typeof props.animationSpeed === "number") sprite.animationSpeed = props.animationSpeed;
    if (typeof props.loop === "boolean") sprite.loop = props.loop;

    if (props.playing ?? true) sprite.play();
  }

  get sprite(): PIXI.AnimatedSprite {
    return this._sprite;
  }
}

