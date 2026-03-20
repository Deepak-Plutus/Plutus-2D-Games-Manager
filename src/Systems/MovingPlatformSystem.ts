import { Body, Vector } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { MovingPlatformComponent } from '../Components/MovingPlatformComponent';
import { TransformComponent } from '../Components/TransformComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { GroundedComponent } from '../Components/GroundedComponent';

export class MovingPlatformSystem extends System {
  update(dt: number, world: World): void {
    const state = world.getResource<{ current?: string }>('state');
    if (state?.current === 'paused') return;

    const dtSec = Math.max(0, dt) / 1000;
    for (const [entity, mover, transform] of world.query(MovingPlatformComponent, TransformComponent)) {
      const start = mover.start ?? (mover.axis === 'x' ? transform.position.x : transform.position.y);
      if (mover.start === undefined) mover.start = start;

      const current = mover.axis === 'x' ? transform.position.x : transform.position.y;
      const min = start - mover.range;
      const max = start + mover.range;
      if (current <= min) mover.dir = 1;
      if (current >= max) mover.dir = -1;

      const next = current + mover.dir * mover.speed * dtSec;
      const clamped = Math.max(min, Math.min(max, next));
      const delta = clamped - current;

      if (mover.axis === 'x') transform.position = { x: clamped, y: transform.position.y };
      else transform.position = { x: transform.position.x, y: clamped };

      const phys = world.getComponent(entity, PhysicsBodyComponent);
      if (phys) {
        const x = mover.axis === 'x' ? clamped : transform.position.x;
        const y = mover.axis === 'y' ? clamped : transform.position.y;
        Body.setPosition(phys.body, Vector.create(x, y));
        Body.setVelocity(phys.body, Vector.create(0, 0));
        if (Math.abs(delta) > 0.0001) {
          this.carryRiders(world, phys.body, mover.axis, delta);
        }
      }
    }
  }

  private carryRiders(world: World, platformBody: Body, axis: 'x' | 'y', delta: number): void {
    for (const e of world.allEntities()) {
      const riderPhys = world.getComponent(e, PhysicsBodyComponent);
      if (!riderPhys || riderPhys.body === platformBody || riderPhys.body.isStatic) continue;
      const grounded = world.getComponent(e, GroundedComponent);
      if (!grounded?.grounded) continue;

      const pb = platformBody.bounds;
      const rb = riderPhys.body.bounds;
      const riderBottom = rb.max.y;
      const topGap = Math.abs(riderBottom - pb.min.y);
      const overlapX = rb.max.x >= pb.min.x && rb.min.x <= pb.max.x;
      const overlapY = rb.max.y >= pb.min.y && rb.min.y <= pb.max.y;
      const onTop = topGap <= 10 && overlapX;
      const touchingForVertical = overlapY && overlapX;
      if (!onTop && !(axis === 'y' && touchingForVertical)) continue;

      const newPos =
        axis === 'x'
          ? Vector.create(riderPhys.body.position.x + delta, riderPhys.body.position.y)
          : Vector.create(riderPhys.body.position.x, riderPhys.body.position.y + delta);
      Body.setPosition(riderPhys.body, newPos);
    }
  }
}
