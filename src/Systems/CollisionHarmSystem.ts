import { Events } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { CollisionHarmComponent } from '../Components/CollisionHarmComponent';
import { HealthComponent } from '../Components/HealthComponent';
import type { PhysicsState } from './PhysicsSystem';
import { RES_PHYSICS } from './PhysicsSystem';

/**
 * CollisionHarmSystem
 * Applies damage when an entity with CollisionHarm collides with an entity with Health.
 * (Uses Matter collision events; requires PhysicsBody on both to collide.)
 */
export class CollisionHarmSystem extends System {
  private attached = false;
  private worldRef?: World;
  private nowMs = 0;

  update(dt: number, world: World): void {
    this.nowMs += dt;

    const phys = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!phys) return;

    if (!this.attached) {
      this.worldRef = world;
      this.attach(phys);
      this.attached = true;
    }
  }

  private attach(phys: PhysicsState): void {
    Events.on(phys.engine, 'collisionStart', (evt) => {
      const world = this.worldRef;
      if (!world) return;

      for (const pair of evt.pairs) {
        this.tryHit(world, pair.bodyA, pair.bodyB);
        this.tryHit(world, pair.bodyB, pair.bodyA);
      }
    });
  }

  private tryHit(world: World, harmBody: any, otherBody: any): void {
    const harmId = getEntityId(harmBody);
    const otherId = getEntityId(otherBody);
    if (!harmId || !otherId) return;

    const harmEnt = world.getEntity(harmId);
    const otherEnt = world.getEntity(otherId);
    if (!harmEnt || !otherEnt) return;

    const harm = world.getComponent(harmEnt, CollisionHarmComponent);
    const hp = world.getComponent(otherEnt, HealthComponent);
    if (!harm || !hp) return;

    if (!harm.canHit(this.nowMs)) return;
    harm.markHit(this.nowMs);
    harm.applyDamage(hp as any);
    if (hp.hp <= 0) {
      // Later: integrate with EntitiesManagementSystem to despawn, play VFX, etc.
      console.log(`[health] ${otherEnt.name} died`);
    }
  }
}

function getEntityId(body: any): number | undefined {
  const id = body?.plugin?.entityId;
  return typeof id === 'number' ? id : undefined;
}

