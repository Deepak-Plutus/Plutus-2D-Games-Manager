import type { Vector as MatterVector } from "matter-js";

export type BounceComponentProps = {
  restitution?: number;
};

export class BounceComponent {
  static readonly type = "Bounce";
  readonly type = BounceComponent.type;

  restitution: number;

  constructor(props: BounceComponentProps = {}) {
    this.restitution = typeof props.restitution === "number" ? clamp01(props.restitution) : 0.4;
  }

  setRestitution(value: number): void {
    if (!Number.isFinite(value)) return;
    this.restitution = clamp01(value);
  }

  getRestitution(): number {
    return this.restitution;
  }

  applyBounce(normal: MatterVector, velocity: MatterVector): MatterVector {
    const dot = velocity.x * normal.x + velocity.y * normal.y;
    const rx = velocity.x - (1 + this.restitution) * dot * normal.x;
    const ry = velocity.y - (1 + this.restitution) * dot * normal.y;
    return { x: rx, y: ry } as MatterVector;
  }

  clearBounce(): void {
    this.restitution = 0;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

