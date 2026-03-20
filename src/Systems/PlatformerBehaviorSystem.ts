import { Body, Vector } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { PlatformerBehaviorComponent } from '../Components/PlatformerBehaviorComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { GroundedComponent } from '../Components/GroundedComponent';
import type { InputState } from './InputSystem';
import { RES_INPUT } from './InputSystem';

export const RES_PLATFORMER_BEHAVIOR_API = 'platformer_behavior_api';
export type PlatformerBehaviorApi = {
  setHorizontalMultiplier: (value: number) => void;
  setJumpMultiplier: (value: number) => void;
  getHorizontalMultiplier: () => number;
  getJumpMultiplier: () => number;
};

/**
 * PlatformerBehaviorSystem (Construct-like)
 * Uses Matter bodies and a behavior component to provide:
 * - acceleration / deceleration
 * - max speed
 * - air control
 * - jump with variable height (jump-cut on release)
 *
 * Requires: PhysicsBodyComponent + PlatformerBehaviorComponent
 * Optional: GroundedComponent (recommended for proper jumping)
 */
export class PlatformerBehaviorSystem extends System {
  private horizontalMultiplier = 1;
  private jumpMultiplier = 1;

  get singletonKey(): string {
    return 'PlatformerBehaviorSystem';
  }

  update(_dt: number, world: World): void {
    if (!world.getResource<PlatformerBehaviorApi>(RES_PLATFORMER_BEHAVIOR_API)) {
      world.setResource<PlatformerBehaviorApi>(RES_PLATFORMER_BEHAVIOR_API, {
        setHorizontalMultiplier: (value: number) => (this.horizontalMultiplier = Math.max(0, value)),
        setJumpMultiplier: (value: number) => (this.jumpMultiplier = Math.max(0, value)),
        getHorizontalMultiplier: () => this.horizontalMultiplier,
        getJumpMultiplier: () => this.jumpMultiplier,
      });
    }

    const state = world.getResource<{ current?: string }>('state');
    if (state?.current === 'paused') return;

    const input = world.getResource<InputState>(RES_INPUT);
    if (!input) return;

    const left = input.keysDown.has('ArrowLeft') || input.keysDown.has('KeyA');
    const right = input.keysDown.has('ArrowRight') || input.keysDown.has('KeyD');
    const jumpDown = input.keysDown.has('Space') || input.keysDown.has('ArrowUp') || input.keysDown.has('KeyW');
    const jumpPressed = input.justPressed.has('Space') || input.justPressed.has('ArrowUp') || input.justPressed.has('KeyW');
    const jumpReleased = input.justReleased.has('Space') || input.justReleased.has('ArrowUp') || input.justReleased.has('KeyW');

    const dir = (right ? 1 : 0) - (left ? 1 : 0);

    for (const [entity, behavior, phys] of world.query(PlatformerBehaviorComponent, PhysicsBodyComponent)) {
      const body = phys.body;
      if (body.isStatic) continue;

      const grounded = world.getComponent(entity, GroundedComponent)?.grounded ?? false;
      const control = grounded ? 1 : clamp01(behavior.airControl);

      // Horizontal control: accelerate toward target vx
      const targetVx = dir * behavior.maxSpeedX * this.horizontalMultiplier;
      const vx = body.velocity.x;

      const dv = targetVx - vx;
      if (Math.abs(targetVx) > 0.001) {
        // accelerate toward target
        const forceX = dv * behavior.accel * control;
        Body.applyForce(body, body.position, Vector.create(forceX, 0));
      } else {
        // no input: brake toward 0
        const forceX = -vx * behavior.decel * control;
        Body.applyForce(body, body.position, Vector.create(forceX, 0));
      }

      // Clamp max speed
      if (Math.abs(body.velocity.x) > behavior.maxSpeedX) {
        Body.setVelocity(body, { x: Math.sign(body.velocity.x) * behavior.maxSpeedX, y: body.velocity.y });
      }

      // Jump
      if (jumpPressed && grounded) {
        Body.applyForce(body, body.position, Vector.create(0, -Math.abs(behavior.jumpImpulse) * this.jumpMultiplier));
      }

      // Variable jump height: if released while going up, cut vertical speed
      if (jumpReleased && body.velocity.y < 0 && !jumpDown) {
        Body.setVelocity(body, { x: body.velocity.x, y: body.velocity.y * behavior.jumpCutMultiplier });
      }
    }
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

