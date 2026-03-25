import { Body, Vector, type Body as MatterBody } from 'matter-js';

export class PhysicsBodyComponent {
  private _body: MatterBody;

  constructor(body: MatterBody) {
    this._body = body;
  }

  get body(): MatterBody {
    return this._body;
  }

  set body(value: MatterBody) {
    this._body = value;
  }

  applyForce(x: number, y: number): void {
    Body.applyForce(this._body, this._body.position, Vector.create(x, y));
  }

  applyImpulse(x: number, y: number): void {
    const m = Math.max(1e-6, this._body.mass);
    Body.setVelocity(this._body, Vector.create(this._body.velocity.x + x / m, this._body.velocity.y + y / m));
  }

  setMass(m: number): void {
    if (!Number.isFinite(m) || m <= 0) return;
    Body.setMass(this._body, m);
  }

  setStatic(v: boolean): void {
    Body.setStatic(this._body, !!v);
  }

  isStatic(): boolean {
    return this._body.isStatic;
  }

  setVelocity(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    Body.setVelocity(this._body, Vector.create(x, y));
  }

  getVelocity(): { x: number; y: number } {
    return { x: this._body.velocity.x, y: this._body.velocity.y };
  }

  setPosition(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    Body.setPosition(this._body, Vector.create(x, y));
  }

  getPosition(): { x: number; y: number } {
    return { x: this._body.position.x, y: this._body.position.y };
  }

  integrate(dtMs: number): void {
    const dt = Math.max(0, dtMs) / 1000;
    if (dt <= 0 || this._body.isStatic) return;
    Body.setPosition(this._body, Vector.create(this._body.position.x + this._body.velocity.x * dt, this._body.position.y + this._body.velocity.y * dt));
    Body.setAngle(this._body, this._body.angle + this._body.angularVelocity * dt);
  }
}

