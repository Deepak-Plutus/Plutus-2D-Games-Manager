import type { Vec2 } from "../TransformComponent";

export type LayoutAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type LayoutComponentProps = {
  anchor?: LayoutAnchor;
  marginX?: number;
  marginY?: number;
};

export class LayoutComponent {
  static readonly type = "Layout";
  readonly type = LayoutComponent.type;

  anchor: LayoutAnchor;
  margin: Vec2;

  // runtime
  _dirty = true;

  constructor(props: LayoutComponentProps = {}) {
    this.anchor = props.anchor ?? "top-left";
    this.margin = { x: props.marginX ?? 0, y: props.marginY ?? 0 };
  }

  setAnchor(anchor: LayoutAnchor): void {
    this.anchor = anchor;
    this._dirty = true;
  }

  getAnchor(): LayoutAnchor {
    return this.anchor;
  }

  setMargin(x: number, y: number): void {
    this.margin = { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
    this._dirty = true;
  }

  getMargin(): Vec2 {
    return { x: this.margin.x, y: this.margin.y };
  }

  updateLayout(): void {
    this._dirty = true;
  }

  isDirty(): boolean {
    return this._dirty;
  }

  clearDirty(): void {
    this._dirty = false;
  }
}

