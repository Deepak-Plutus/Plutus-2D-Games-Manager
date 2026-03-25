export class ClickableComponent {
  static readonly type = "Clickable";
  readonly type = ClickableComponent.type;

  // runtime
  _attached?: boolean;
  _onClick: Array<() => void> = [];
  _onHover: Array<(hovered: boolean) => void> = [];
  _onPress: Array<(pressed: boolean) => void> = [];

  onClick(cb: () => void): void {
    if (typeof cb !== "function") return;
    this._onClick.push(cb);
  }

  offClick(cb: () => void): void {
    this._onClick = this._onClick.filter((fn) => fn !== cb);
  }

  onHover(cb: (hovered: boolean) => void): void {
    if (typeof cb !== "function") return;
    this._onHover.push(cb);
  }

  offHover(cb: (hovered: boolean) => void): void {
    this._onHover = this._onHover.filter((fn) => fn !== cb);
  }

  onPress(cb: (pressed: boolean) => void): void {
    if (typeof cb !== "function") return;
    this._onPress.push(cb);
  }

  offPress(cb: (pressed: boolean) => void): void {
    this._onPress = this._onPress.filter((fn) => fn !== cb);
  }

  emitClick(): void {
    for (const cb of this._onClick) cb();
  }

  emitHover(v: boolean): void {
    for (const cb of this._onHover) cb(v);
  }

  emitPress(v: boolean): void {
    for (const cb of this._onPress) cb(v);
  }

  clearListeners(): void {
    this._onClick = [];
    this._onHover = [];
    this._onPress = [];
  }
}

