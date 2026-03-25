export type FollowTargetComponentProps = {
  targetEntityName?: string;
  minDistance?: number;
  speed?: number;
};

export class FollowTargetComponent {
  static readonly type = "FollowTarget";
  readonly type = FollowTargetComponent.type;

  targetEntityName: string;
  minDistance: number;
  speed: number;

  constructor(props: FollowTargetComponentProps = {}) {
    this.targetEntityName = props.targetEntityName ?? "";
    this.minDistance = typeof props.minDistance === "number" ? Math.max(0, props.minDistance) : 64;
    this.speed = typeof props.speed === "number" ? Math.max(0, props.speed) : 120;
  }

  setTarget(entity: string): void {
    if (!entity) return;
    this.targetEntityName = entity;
  }

  clearTarget(): void {
    this.targetEntityName = "";
  }

  setDistance(d: number): void {
    if (!Number.isFinite(d)) return;
    this.minDistance = Math.max(0, d);
  }

  setSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return;
    this.speed = Math.max(0, speed);
  }

  hasTarget(): boolean {
    return this.targetEntityName.length > 0;
  }

  updateFollow(_dtMs: number): void {
    // System-driven behaviour; method kept for API parity.
  }
}

