import type { PhysicsBodyComponent } from "./PhysicsBodyComponent";

export type GravityComponentProps = {
  x?: number;
  y?: number;
  enabled?: boolean;
};

export class GravityComponent {
  static readonly type = "Gravity";
  readonly type = GravityComponent.type;

  x: number;
  y: number;
  enabled: boolean;

  constructor(props: GravityComponentProps = {}) {
    this.x = typeof props.x === "number" ? props.x : 0;
    this.y = typeof props.y === "number" ? props.y : 1;
    this.enabled = props.enabled ?? true;
  }

  setGravity(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.x = x;
    this.y = y;
  }

  getGravity(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  enableGravity(): void {
    this.enabled = true;
  }

  disableGravity(): void {
    this.enabled = false;
  }

  toggleGravity(): void {
    this.enabled = !this.enabled;
  }

  applyGravity(dtMs: number, body?: PhysicsBodyComponent): void {
    if (!this.enabled || !body) return;
    const dt = Math.max(0, dtMs) / 1000;
    body.applyForce(this.x * dt, this.y * dt);
  }
}

