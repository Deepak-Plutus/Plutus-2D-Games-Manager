export class VisibilityComponent {
  static readonly type = "Visibility";
  readonly type = VisibilityComponent.type;

  private _visible: boolean;

  constructor(init?: Partial<VisibilityComponent>) {
    // default visible
    this._visible = (init as any)?._visible ?? true;
  }

  show(): void {
    this._visible = true;
  }

  hide(): void {
    this._visible = false;
  }

  toggle(): void {
    this._visible = !this._visible;
  }

  isVisible(): boolean {
    return this._visible;
  }

  setVisible(v: boolean): void {
    this._visible = !!v;
  }

  get visible(): boolean {
    return this._visible;
  }

  reset(): void {
    this._visible = true;
  }
}

