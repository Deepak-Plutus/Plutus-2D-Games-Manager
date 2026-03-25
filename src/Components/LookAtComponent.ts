import type { Vec2 } from "./TransformComponent";

export type LookAtComponentProps = {
  targetEntityName?: string;
  rotationSpeed?: number;
  targetPosition?: Vec2;
};

export class LookAtComponent {
  static readonly type = "LookAt";
  readonly type = LookAtComponent.type;

  targetEntityName?: string;
  rotationSpeed: number;
  targetPosition?: Vec2;
  desiredRotation = 0;

  constructor(props: LookAtComponentProps = {}) {
    this.targetEntityName = props.targetEntityName;
    this.rotationSpeed = typeof props.rotationSpeed === "number" ? Math.max(0, props.rotationSpeed) : 6;
    this.targetPosition = props.targetPosition ? { x: props.targetPosition.x, y: props.targetPosition.y } : undefined;
  }

  lookAt(target: Vec2): void {
    this.targetPosition = { x: target.x, y: target.y };
  }

  setTargetEntity(name?: string): void {
    this.targetEntityName = name;
  }

  clearTargetEntity(): void {
    this.targetEntityName = undefined;
  }

  rotateTowards(target: Vec2, speed: number): void {
    this.targetPosition = { x: target.x, y: target.y };
    if (Number.isFinite(speed) && speed >= 0) this.rotationSpeed = speed;
  }

  clearTargetPosition(): void {
    this.targetPosition = undefined;
  }

  setRotationSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return;
    this.rotationSpeed = Math.max(0, speed);
  }

  hasTarget(): boolean {
    return !!this.targetEntityName || !!this.targetPosition;
  }
}

