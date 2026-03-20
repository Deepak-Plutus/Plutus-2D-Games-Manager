import { Body, Vector } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { PhysicsControllerComponent } from '../Components/PhysicsControllerComponent';
import { GroundedComponent } from '../Components/GroundedComponent';
import { PlatformerBehaviorComponent } from '../Components/PlatformerBehaviorComponent';
import type { InputState } from './InputSystem';
import { RES_INPUT } from './InputSystem';

/**
 * PhysicsMovementSystem
 * Uses keyboard input to drive Matter bodies.
 *
 * - platformer: left/right sets target vx, jump applies impulse when grounded.
 * - topdown: sets target vx/vy (no gravity assumed).
 */
export class PhysicsMovementSystem extends System {
  update(_dt: number, world: World): void {
    const state = world.getResource<{ current?: string }>('state');
    if (state?.current === 'paused') return;

    const input = world.getResource<InputState>(RES_INPUT);
    if (!input) return;

    for (const [entity, ctrl, phys] of world.query(PhysicsControllerComponent, PhysicsBodyComponent)) {
      // If Construct-like platformer behavior exists, don't also drive via PhysicsController.
      if (world.hasComponent(entity, PlatformerBehaviorComponent)) continue;

      const body = phys.body;
      if (body.isStatic) continue;

      if (ctrl.mode === 'topdown') {
        this.applyTopdown(input, ctrl, body);
      } else {
        const groundedComp = world.getComponent(entity, GroundedComponent);
        const grounded = groundedComp?.grounded ?? isGroundedApprox(body);
        this.applyPlatformer(input, ctrl, body, grounded);
      }
    }
  }

  private applyTopdown(input: InputState, ctrl: PhysicsControllerComponent, body: Body): void {
    const left = input.keysDown.has('ArrowLeft') || input.keysDown.has('KeyA');
    const right = input.keysDown.has('ArrowRight') || input.keysDown.has('KeyD');
    const up = input.keysDown.has('ArrowUp') || input.keysDown.has('KeyW');
    const down = input.keysDown.has('ArrowDown') || input.keysDown.has('KeyS');

    const x = (right ? 1 : 0) - (left ? 1 : 0);
    const y = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(x, y);
    const nx = len > 0 ? x / len : 0;
    const ny = len > 0 ? y / len : 0;

    const targetVx = nx * ctrl.moveSpeed;
    const targetVy = ny * ctrl.moveSpeed;
    Body.setVelocity(body, {
      x: clamp(targetVx, -ctrl.maxSpeedX, ctrl.maxSpeedX),
      y: clamp(targetVy, -ctrl.maxSpeedY, ctrl.maxSpeedY),
    });
  }

  private applyPlatformer(input: InputState, ctrl: PhysicsControllerComponent, body: Body, grounded: boolean): void {
    const left = input.keysDown.has('ArrowLeft') || input.keysDown.has('KeyA');
    const right = input.keysDown.has('ArrowRight') || input.keysDown.has('KeyD');
    const jumpPressed =
      input.justPressed.has('Space') || input.justPressed.has('ArrowUp') || input.justPressed.has('KeyW');

    const dir = (right ? 1 : 0) - (left ? 1 : 0);

    const control = grounded ? 1 : clamp(ctrl.airControl, 0, 1);

    // Drive vx toward a target speed
    const targetVx = dir * ctrl.moveSpeed;
    const vx = body.velocity.x;
    const dvx = (targetVx - vx) * 0.15 * control;
    Body.setVelocity(body, {
      x: clamp(vx + dvx, -ctrl.maxSpeedX, ctrl.maxSpeedX),
      y: clamp(body.velocity.y, -ctrl.maxSpeedY, ctrl.maxSpeedY),
    });

    // Jump impulse if grounded
    if (jumpPressed && grounded) {
      const impulse = Vector.create(0, -Math.abs(ctrl.jumpImpulse));
      Body.applyForce(body, body.position, impulse);
    }
  }
}

function isGroundedApprox(body: Body): boolean {
  // Simple heuristic: if vertical velocity is very small, assume grounded.
  // Later we can upgrade this to collision-based grounding (better).
  return Math.abs(body.velocity.y) < 0.2;
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

