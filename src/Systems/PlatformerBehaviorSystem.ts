import { Body, Vector } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { PlatformerBehaviorComponent } from '../Components/PlatformerBehaviorComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { GroundedComponent } from '../Components/GroundedComponent';
import type { InputState } from './InputSystem';
import { RES_INPUT } from './InputSystem';
import { RES_GAME_DEF } from './LoadingSystem';
import { RES_SPRING_JUMP_LOCK, type SpringJumpLockState } from './SpringPlatformSystem';

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
  private coyoteTimers = new Map<number, number>();
  private jumpBuffers = new Map<number, number>();

  get singletonKey(): string {
    return 'PlatformerBehaviorSystem';
  }

  update(dt: number, world: World): void {
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
    const dtMs = Math.max(0, dt);
    const def = world.getResource<GameDefinition>(RES_GAME_DEF);

    const keyboardDir = (right ? 1 : 0) - (left ? 1 : 0);

    for (const [entity, behavior, phys] of world.query(PlatformerBehaviorComponent, PhysicsBodyComponent)) {
      behavior.updateMovement(dtMs);
      const body = phys.body;
      if (body.isStatic) continue;

      const groundedByContacts = world.getComponent(entity, GroundedComponent)?.grounded ?? false;
      const grounded =
        groundedByContacts || this.hasSupportUnderFeet(world, phys.body, body.velocity.y, entity.id);
      const control = grounded ? 1 : clamp01(behavior.airControl);
      const entityId = entity.id;

      // Allow method-driven intents in addition to keyboard input.
      const intentDir = behavior.consumeMoveIntent();
      const dir = keyboardDir !== 0 ? keyboardDir : intentDir;

      // Jump buffer + coyote time (smoother platformer feel)
      if (grounded) this.coyoteTimers.set(entityId, behavior.coyoteTimeMs);
      else this.coyoteTimers.set(entityId, Math.max(0, (this.coyoteTimers.get(entityId) ?? 0) - dtMs));

      if (jumpPressed || behavior.consumeJumpIntent()) this.jumpBuffers.set(entityId, behavior.jumpBufferMs);
      else this.jumpBuffers.set(entityId, Math.max(0, (this.jumpBuffers.get(entityId) ?? 0) - dtMs));

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

      const springLocks = world.getResource<SpringJumpLockState>(RES_SPRING_JUMP_LOCK);
      const springLocked = (springLocks?.get(entity.id) ?? 0) > 0;

      // Jump (buffered + coyote), but do not stack while spring auto-jump lock is active.
      const canJump = (this.jumpBuffers.get(entityId) ?? 0) > 0 && (this.coyoteTimers.get(entityId) ?? 0) > 0;
      if (canJump && !springLocked) {
        Body.applyForce(body, body.position, Vector.create(0, -Math.abs(behavior.jumpImpulse) * this.jumpMultiplier));
        this.jumpBuffers.set(entityId, 0);
        this.coyoteTimers.set(entityId, 0);
      }

      // Variable jump height: if released while going up, cut vertical speed
      if (jumpReleased && body.velocity.y < 0 && !jumpDown) {
        Body.setVelocity(body, { x: body.velocity.x, y: body.velocity.y * behavior.jumpCutMultiplier });
      }

      // Cap fall speed
      if (body.velocity.y > behavior.maxFallSpeed) {
        Body.setVelocity(body, { x: body.velocity.x, y: behavior.maxFallSpeed });
      }

      // Keep within horizontal world bounds (prevents moving back/outside area)
      this.applyHorizontalBounds(body, entity.view.width, def);

      behavior.clearMoveIntent();
    }
  }

  private applyHorizontalBounds(body: Body, viewWidth: number, def: GameDefinition | undefined): void {
    const bounds = def?.world?.bounds;
    if (!Array.isArray(bounds) || bounds.length < 4) return;
    const bx = Number(bounds[0]);
    const bw = Number(bounds[2]);
    if (!Number.isFinite(bx) || !Number.isFinite(bw)) return;

    const halfW = Math.max(1, viewWidth * 0.5);
    const minX = bx + halfW;
    const maxX = bx + bw - halfW;
    if (minX > maxX) return;

    let x = body.position.x;
    let vx = body.velocity.x;
    if (x < minX) {
      x = minX;
      if (vx < 0) vx = 0;
    } else if (x > maxX) {
      x = maxX;
      if (vx > 0) vx = 0;
    }

    if (x !== body.position.x) {
      Body.setPosition(body, Vector.create(x, body.position.y));
      Body.setVelocity(body, Vector.create(vx, body.velocity.y));
    }
  }

  /**
   * Fallback grounded check for moving/kinematic platforms.
   * Collision events can briefly jitter when a platform body is repositioned each frame.
   * This checks if there is any non-sensor body directly under feet with horizontal overlap.
   */
  private hasSupportUnderFeet(world: World, body: Body, vy: number, selfId: number): boolean {
    if (vy < -0.25) return false; // rising: don't consider grounded

    const feetY = body.bounds.max.y;
    const minX = body.bounds.min.x + 2;
    const maxX = body.bounds.max.x - 2;
    const tolerance = 6;

    for (const [, otherPhys] of world.query(PhysicsBodyComponent)) {
      const otherBody = otherPhys.body;
      if ((otherBody as any).plugin?.entityId === selfId) continue;
      if (otherBody.isSensor) continue;

      const ob = otherBody.bounds;
      const overlapX = maxX >= ob.min.x && minX <= ob.max.x;
      if (!overlapX) continue;

      const gap = ob.min.y - feetY;
      if (gap >= -2 && gap <= tolerance) return true;
    }

    return false;
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

