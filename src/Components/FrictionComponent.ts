export type FrictionComponentProps = {
  value?: number;
};

export class FrictionComponent {
  static readonly type = "Friction";
  readonly type = FrictionComponent.type;

  value: number;

  constructor(props: FrictionComponentProps = {}) {
    this.value = typeof props.value === "number" ? clamp01(props.value) : 0.02;
  }

  setFriction(value: number): void {
    if (!Number.isFinite(value)) return;
    this.value = clamp01(value);
  }

  getFriction(): number {
    return this.value;
  }

  applyFriction(velocity: { x: number; y: number }, dtMs: number): { x: number; y: number } {
    const dt = Math.max(0, dtMs) / 1000;
    const k = Math.max(0, 1 - this.value * dt * 60);
    return { x: velocity.x * k, y: velocity.y * k };
  }

  clearFriction(): void {
    this.value = 0;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

