import type { EntityBase } from "../Entities/EntityBase";

export class CollisionResponseComponent {
  static readonly type = "CollisionResponse";
  readonly type = CollisionResponseComponent.type;

  private _onEnter: Array<(entity: EntityBase) => void> = [];
  private _onStay: Array<(entity: EntityBase) => void> = [];
  private _onExit: Array<(entity: EntityBase) => void> = [];

  onCollisionEnter(entity: EntityBase): void {
    for (const cb of this._onEnter) cb(entity);
  }

  onCollisionStay(entity: EntityBase): void {
    for (const cb of this._onStay) cb(entity);
  }

  onCollisionExit(entity: EntityBase): void {
    for (const cb of this._onExit) cb(entity);
  }

  resolveCollision(_entity: EntityBase): void {
    // Reserved hook for game-specific custom collision handling.
  }

  addEnterListener(cb: (entity: EntityBase) => void): void {
    this._onEnter.push(cb);
  }

  addStayListener(cb: (entity: EntityBase) => void): void {
    this._onStay.push(cb);
  }

  addExitListener(cb: (entity: EntityBase) => void): void {
    this._onExit.push(cb);
  }

  removeEnterListener(cb: (entity: EntityBase) => void): void {
    this._onEnter = this._onEnter.filter((fn) => fn !== cb);
  }

  removeStayListener(cb: (entity: EntityBase) => void): void {
    this._onStay = this._onStay.filter((fn) => fn !== cb);
  }

  removeExitListener(cb: (entity: EntityBase) => void): void {
    this._onExit = this._onExit.filter((fn) => fn !== cb);
  }

  clearListeners(): void {
    this._onEnter = [];
    this._onStay = [];
    this._onExit = [];
  }
}

