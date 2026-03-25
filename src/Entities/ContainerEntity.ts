import * as PIXI from "pixi.js";
import { EntityBase } from "./EntityBase";

export class ContainerEntity extends EntityBase {
  private _container: PIXI.Container;

  constructor(container?: PIXI.Container) {
    const c = container ?? new PIXI.Container();
    super(c);
    this._container = c;
  }

  get container(): PIXI.Container {
    return this._container;
  }
}

