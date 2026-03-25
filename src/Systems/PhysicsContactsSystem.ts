import { Events } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { GroundedComponent } from '../Components/GroundedComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { CollisionResponseComponent } from '../Components/CollisionResponseComponent';
import { BounceComponent } from '../Components/BounceComponent';
import { Body, Vector } from 'matter-js';
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
  private activePairs = new Set<string>();

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
      grounded.setGrounded(count > 0);
    }

    // Dispatch collision stay callbacks
    for (const key of this.activePairs) {
      const [aRaw, bRaw] = key.split('|');
      const aId = Number(aRaw);
      const bId = Number(bRaw);
      if (!Number.isFinite(aId) || !Number.isFinite(bId)) continue;
      this.dispatchCollisionStay(aId, bId);
      this.dispatchCollisionStay(bId, aId);
    }
  }

  private attach(phys: PhysicsState, world: World): void {
    const engine = phys.engine;

    Events.on(engine, 'collisionStart', (evt) => {
      for (const pair of evt.pairs) {
        const aId = getEntityId(pair.bodyA);
        const bId = getEntityId(pair.bodyB);
        if (!aId && !bId) continue;
        if (aId && bId) this.activePairs.add(pairKey(aId, bId));

        // pair.collision.normal points from bodyA -> bodyB (Matter docs)
        // Y+ is downward in canvas coords.
        const ny = pair.collision.normal.y;
        const nearVertical = Math.abs(ny) > 0.45;
        if (!nearVertical) continue;

        if (aId) this.incGround(aId);
        if (bId) this.incGround(bId);
        if (aId && bId) {
          this.applyBounceForPair(aId, bId, pair.collision.normal);
          this.applyBounceForPair(bId, aId, Vector.create(-pair.collision.normal.x, -pair.collision.normal.y));
          this.dispatchCollisionEnter(aId, bId);
          this.dispatchCollisionEnter(bId, aId);
        }
      }
    });

    Events.on(engine, 'collisionEnd', (evt) => {
      for (const pair of evt.pairs) {
        const aId = getEntityId(pair.bodyA);
        const bId = getEntityId(pair.bodyB);
        if (!aId && !bId) continue;
        if (aId && bId) this.activePairs.delete(pairKey(aId, bId));

        const ny = pair.collision.normal.y;
        const nearVertical = Math.abs(ny) > 0.45;
        if (!nearVertical) continue;

        if (aId) this.decGround(aId);
        if (bId) this.decGround(bId);
        if (aId && bId) {
          this.dispatchCollisionExit(aId, bId);
          this.dispatchCollisionExit(bId, aId);
        }
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
          grounded.reset();
        }
      }
      return;
    }
    this.groundCounts.clear();
  }

  private dispatchCollisionEnter(selfId: number, otherId: number): void {
    const world = this.worldRef;
    if (!world) return;
    const self = world.getEntity(selfId);
    const other = world.getEntity(otherId);
    if (!self || !other) return;
    const c = world.getComponent(self, CollisionResponseComponent);
    if (!c) return;
    c.onCollisionEnter(other);
    c.resolveCollision(other);
  }

  private dispatchCollisionStay(selfId: number, otherId: number): void {
    const world = this.worldRef;
    if (!world) return;
    const self = world.getEntity(selfId);
    const other = world.getEntity(otherId);
    if (!self || !other) return;
    const c = world.getComponent(self, CollisionResponseComponent);
    if (!c) return;
    c.onCollisionStay(other);
  }

  private dispatchCollisionExit(selfId: number, otherId: number): void {
    const world = this.worldRef;
    if (!world) return;
    const self = world.getEntity(selfId);
    const other = world.getEntity(otherId);
    if (!self || !other) return;
    const c = world.getComponent(self, CollisionResponseComponent);
    if (!c) return;
    c.onCollisionExit(other);
  }

  private applyBounceForPair(selfId: number, _otherId: number, normal: Vector): void {
    const world = this.worldRef;
    if (!world) return;
    const self = world.getEntity(selfId);
    if (!self) return;
    const bounce = world.getComponent(self, BounceComponent);
    const phys = world.getComponent(self, PhysicsBodyComponent);
    if (!bounce || !phys || phys.body.isStatic) return;
    const next = bounce.applyBounce(normal, phys.body.velocity as Vector);
    Body.setVelocity(phys.body, Vector.create(next.x, next.y));
  }
}

function getEntityId(body: any): number | undefined {
  const id = body?.plugin?.entityId;
  return typeof id === 'number' ? id : undefined;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

