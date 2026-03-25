export type SpriteRenderComponentProps = {
  texture?: string;
  tint?: number;
  alpha?: number;
  visible?: boolean;
  flipX?: boolean;
  flipY?: boolean;
};

export class SpriteRenderComponent {
  static readonly type = "SpriteRender";
  readonly type = SpriteRenderComponent.type;

  texture?: string;
  tint: number;
  alpha: number;
  visible: boolean;
  flipXState = false;
  flipYState = false;

  constructor(props: SpriteRenderComponentProps = {}) {
    this.texture = typeof props.texture === "string" ? props.texture : undefined;
    this.tint = typeof props.tint === "number" ? props.tint : 0xffffff;
    this.alpha = typeof props.alpha === "number" ? props.alpha : 1;
    this.visible = props.visible ?? true;
    this.flipXState = !!props.flipX;
    this.flipYState = !!props.flipY;
  }

  setTexture(texture: string): void {
    if (!texture) return;
    this.texture = texture;
  }

  clearTexture(): void {
    this.texture = undefined;
  }

  setTint(color: number): void {
    if (!Number.isFinite(color)) return;
    this.tint = color;
  }

  setAlpha(alpha: number): void {
    if (!Number.isFinite(alpha)) return;
    this.alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  }

  flipX(v: boolean): void {
    this.flipXState = !!v;
  }

  flipY(v: boolean): void {
    this.flipYState = !!v;
  }

  setVisible(v: boolean): void {
    this.visible = !!v;
  }

  toggleVisible(): void {
    this.visible = !this.visible;
  }

  isFlippedX(): boolean {
    return this.flipXState;
  }

  isFlippedY(): boolean {
    return this.flipYState;
  }
}

