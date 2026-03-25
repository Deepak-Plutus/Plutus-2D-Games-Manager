import type { Vec2 } from "../TransformComponent";

export class DraggableComponent {
  static readonly type = "Draggable";
  readonly type = DraggableComponent.type;

  // runtime
  _attached?: boolean;
  _dragging = false;
  _pointerOffset: Vec2 = { x: 0, y: 0 };
  _position: Vec2 = { x: 0, y: 0 };

  startDrag(): void {
    this._dragging = true;
  }

  dragTo(pos: Vec2): void {
    this._position = { x: pos.x, y: pos.y };
  }

  endDrag(): void {
    this._dragging = false;
  }
}

