export type Vec2 = { x: number; y: number };

export class TransformComponent {
  private _position: Vec2;
  private _rotation: number;
  private _scale: Vec2;

  constructor(init?: Partial<TransformComponent>) {
    this._position = init?.position ?? { x: 0, y: 0 };
    this._rotation = init?.rotation ?? 0;
    this._scale = init?.scale ?? { x: 1, y: 1 };
  }

  get position(): Vec2 {
    return this._position;
  }

  set position(value: Vec2) {
    this._position = value;
  }

  get rotation(): number {
    return this._rotation;
  }

  set rotation(value: number) {
    this._rotation = value;
  }

  get scale(): Vec2 {
    return this._scale;
  }

  set scale(value: Vec2) {
    this._scale = value;
  }

  setPosition(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this._position = { x, y };
  }

  translate(dx: number, dy: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this._position = { x: this._position.x + dx, y: this._position.y + dy };
  }

  setRotation(angle: number): void {
    if (!Number.isFinite(angle)) return;
    this._rotation = angle;
  }

  setScale(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this._scale = { x, y };
  }

  getWorldPosition(): Vec2 {
    // Without parent transform hierarchy in component data, local == world.
    return { x: this._position.x, y: this._position.y };
  }
}

