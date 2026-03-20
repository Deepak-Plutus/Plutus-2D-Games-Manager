import { Events } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { GroundedComponent } from '../Components/GroundedComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import type { PhysicsState } from './PhysicsSystem';
import { RES_PHYSICS } from './PhysicsSystem';

type EntityId = number;
export const RES_PHYSICS_CONTACTS_API = 'physics_contacts_api';

export type PhysicsContactsApi = {
  isGrounded: (entityId: number) => boolean;
  getGroundContacts: (entityId: number) => number;
  resetGroundState: (entityId?: number) => void;
};

/**
 * PhysicsContactsSystem
 * Listens to Matter collisionStart/collisionEnd and maintains simple contact state.
 *
 * First feature: grounded detection for platformers.
 * - A body is "grounded" if it has at least one contact where the other body is below it.
 */
export class PhysicsContactsSystem extends System {
  get singletonKey(): string {
    return 'PhysicsContactsSystem';
  }

  private attached = false;
  private worldRef?: World;

  private groundCounts = new Map<EntityId, number>();

  update(_dt: number, world: World): void {
    this.worldRef = world;
    if (!world.getResource<PhysicsContactsApi>(RES_PHYSICS_CONTACTS_API)) {
      world.setResource<PhysicsContactsApi>(RES_PHYSICS_CONTACTS_API, {
        isGrounded: (entityId: number) => (this.groundCounts.get(entityId) ?? 0) > 0,
        getGroundContacts: (entityId: number) => this.groundCounts.get(entityId) ?? 0,
        resetGroundState: (entityId?: number) => this.resetGroundState(entityId),
      });
    }

    const phys = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!phys) return;

    if (!this.attached) {
      this.attach(phys, world);
      this.attached = true;
    }

    // Apply groundCounts -> GroundedComponent each frame
    for (const [entity, grounded] of world.query(GroundedComponent)) {
      const count = this.groundCounts.get(entity.id) ?? 0;
      grounded.groundContacts = count;
      grounded.grounded = count > 0;
    }
  }

  private attach(phys: PhysicsState, world: World): void {
    const engine = phys.engine;

    Events.on(engine, 'collisionStart', (evt) => {
      for (const pair of evt.pairs) {
        const aId = getEntityId(pair.bodyA);
        const bId = getEntityId(pair.bodyB);
        if (!aId && !bId) continue;

        // pair.collision.normal points from bodyA -> bodyB (Matter docs)
        // Y+ is downward in canvas coords.
        const ny = pair.collision.normal.y;

        if (aId && ny > 0.5) this.incGround(aId);
        if (bId && ny < -0.5) this.incGround(bId);
      }
    });

    Events.on(engine, 'collisionEnd', (evt) => {
      for (const pair of evt.pairs) {
        const aId = getEntityId(pair.bodyA);
        const bId = getEntityId(pair.bodyB);
        if (!aId && !bId) continue;

        const ny = pair.collision.normal.y;
        if (aId && ny > 0.5) this.decGround(aId);
        if (bId && ny < -0.5) this.decGround(bId);
      }
    });

    // Ensure any entity with PhysicsBody can also have Grounded if desired.
    // (No auto-add: JSON can add Grounded component explicitly.)
    for (const [entity] of world.query(PhysicsBodyComponent)) {
      void entity;
    }
  }

  private incGround(id: EntityId): void {
    this.groundCounts.set(id, (this.groundCounts.get(id) ?? 0) + 1);
  }

  private decGround(id: EntityId): void {
    const next = (this.groundCounts.get(id) ?? 0) - 1;
    if (next <= 0) this.groundCounts.delete(id);
    else this.groundCounts.set(id, next);
  }

  private resetGroundState(entityId?: number): void {
    if (typeof entityId === 'number') {
      this.groundCounts.delete(entityId);
      const entity = this.worldRef?.getEntity(entityId);
      if (entity) {
        const grounded = this.worldRef?.getComponent(entity, GroundedComponent);
        if (grounded) {
          grounded.grounded = false;
          grounded.groundContacts = 0;
        }
      }
      return;
    }
    this.groundCounts.clear();
  }
}

function getEntityId(body: any): number | undefined {
  const id = body?.plugin?.entityId;
  return typeof id === 'number' ? id : undefined;
}

