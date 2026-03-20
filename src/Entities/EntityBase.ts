import * as PIXI from 'pixi.js';

export abstract class EntityBase {
  private _id = 0;
  private _name = '';
  private _view: PIXI.Container;

  protected constructor(view?: PIXI.Container) {
    this._view = view ?? new PIXI.Container();
  }

  get id(): number {
    return this._id;
  }

  set id(value: number) {
    this._id = value;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
  }

  get view(): PIXI.Container {
    return this._view;
  }

  set view(value: PIXI.Container) {
    this._view = value;
  }
}

