import type { Body } from 'matter-js';

export class PhysicsBodyComponent {
  private _body: Body;

  constructor(body: Body) {
    this._body = body;
  }

  get body(): Body {
    return this._body;
  }

  set body(value: Body) {
    this._body = value;
  }
}

