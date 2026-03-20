import { Body, Events, Vector } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { SpringPlatformComponent } from '../Components/SpringPlatformComponent';
import type { PhysicsState } from './PhysicsSystem';
import { RES_PHYSICS } from './PhysicsSystem';

export const RES_SPRING_JUMP_LOCK = 'spring_jump_lock';
export type SpringJumpLockState = Map<number, number>;

export class SpringPlatformSystem extends System {
  private attached = false;
  private worldRef?: World;

  update(dt: number, world: World): void {
    this.worldRef = world;
    this.tickLocks(world, dt);

    if (!world.getResource<SpringJumpLockState>(RES_SPRING_JUMP_LOCK)) {
      world.setResource<SpringJumpLockState>(RES_SPRING_JUMP_LOCK, new Map());
    }

    const phys = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!phys || this.attached) return;

    Events.on(phys.engine, 'collisionStart', (evt) => {
      const w = this.worldRef;
      if (!w) return;

      for (const pair of evt.pairs) {
        const a = this.getSpringBoost(w, pair.bodyA);
        const b = this.getSpringBoost(w, pair.bodyB);
        if (!a && !b) continue;

        if (a) this.applyBounce(pair.bodyB, a);
        if (b) this.applyBounce(pair.bodyA, b);
      }
    });

    this.attached = true;
  }

  private getSpringBoost(world: World, body: any): number | undefined {
    const id = body?.plugin?.entityId;
    if (typeof id !== 'number') return undefined;
    const entity = world.getEntity(id);
    if (!entity) return undefined;
    const spring = world.getComponent(entity, SpringPlatformComponent);
    return spring ? spring.jumpBoost : undefined;
  }

  private applyBounce(body: Body, boost: number): void {
    if (!body || body.isStatic || body.isSensor) return;
    // Stronger, deterministic spring jump.
    Body.setVelocity(body, Vector.create(body.velocity.x, -Math.abs(boost)));

    const world = this.worldRef;
    if (!world) return;
    const id = body?.plugin?.entityId;
    if (typeof id !== 'number') return;
    const locks = world.getResource<SpringJumpLockState>(RES_SPRING_JUMP_LOCK);
    if (!locks) return;

    // Prevent manual jump from stacking on top of auto spring bounce.
    locks.set(id, 180);
  }

  private tickLocks(world: World, dt: number): void {
    const locks = world.getResource<SpringJumpLockState>(RES_SPRING_JUMP_LOCK);
    if (!locks) return;
    const step = Math.max(0, dt);
    for (const [id, remain] of locks) {
      const next = remain - step;
      if (next <= 0) locks.delete(id);
      else locks.set(id, next);
    }
  }
}
