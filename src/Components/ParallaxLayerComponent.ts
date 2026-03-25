export type ParallaxLayerComponentProps = {
  /**
   * How much this layer compensates for camera movement.
   * 0   => moves with world (no parallax)
   * 1   => stays fixed in screen space (full compensation)
   */
  factor?: number;
  enabled?: boolean;
};

export class ParallaxLayerComponent {
  static readonly type = 'ParallaxLayer';
  readonly type = ParallaxLayerComponent.type;

  factor: number;
  enabled: boolean;

  // runtime
  _baseX?: number;
  _baseY?: number;
  _scrollX = 1;
  _scrollY = 1;

  constructor(props: ParallaxLayerComponentProps = {}) {
    this.factor = typeof props.factor === 'number' ? props.factor : 1;
    this.enabled = props.enabled ?? true;
    this._scrollX = this.factor;
    this._scrollY = this.factor;
  }

  setScrollFactor(x: number, y: number): void {
    if (Number.isFinite(x)) this._scrollX = x;
    if (Number.isFinite(y)) this._scrollY = y;
    // keep legacy single-factor value in sync for older systems/config
    this.factor = (this._scrollX + this._scrollY) * 0.5;
  }

  updateParallax(cameraX: number, cameraY: number): { x: number; y: number } {
    const baseX = typeof this._baseX === 'number' ? this._baseX : 0;
    const baseY = typeof this._baseY === 'number' ? this._baseY : 0;
    return {
      x: baseX + cameraX * this._scrollX,
      y: baseY + cameraY * this._scrollY,
    };
  }
}

