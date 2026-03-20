import { Events } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { TriggerZoneComponent, type TriggerAction } from '../Components/TriggerZoneComponent';
import type { PhysicsState } from './PhysicsSystem';
import { RES_PHYSICS } from './PhysicsSystem';
import type { AudioApi } from './AudioSystem';
import { RES_AUDIO_API } from './AudioSystem';
import type { EntitiesResource } from './EntitiesManagementSystem';
import { RES_ENTITIES } from './EntitiesManagementSystem';

export const RES_TRIGGER_API = 'trigger_api';
export type TriggerApi = {
  getActivePairCount: () => number;
  resetOnce: (triggerEntityId?: number) => void;
};

/**
 * TriggerSystem
 * Uses Matter collision events to drive JSON-defined trigger actions.
 *
 * Triggers require:
 * - entity has PhysicsBodyComponent (usually isSensor: true, isStatic: true)
 * - entity has TriggerZoneComponent
 */
export class TriggerSystem extends System {
  private attached = false;
  private worldRef?: World;
  private activePairs = new Set<string>();
  private firedOnce = new Set<number>(); // trigger entity id

  get singletonKey(): string {
    return 'TriggerSystem';
  }

  getActivePairCount(): number {
    return this.activePairs.size;
  }

  resetOnce(triggerEntityId?: number): void {
    if (typeof triggerEntityId === 'number') {
      this.firedOnce.delete(triggerEntityId);
      return;
    }
    this.firedOnce.clear();
  }

  update(_dt: number, world: World): void {
    if (!world.getResource<TriggerApi>(RES_TRIGGER_API)) {
      world.setResource<TriggerApi>(RES_TRIGGER_API, {
        getActivePairCount: () => this.getActivePairCount(),
        resetOnce: (triggerEntityId?: number) => this.resetOnce(triggerEntityId),
      });
    }

    const phys = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!phys) return;

    if (!this.attached) {
      this.worldRef = world;
      this.attach(phys);
      this.attached = true;
    }

    // no per-frame work; actions are executed on events
  }

  private attach(phys: PhysicsState): void {
    const engine = phys.engine;

    Events.on(engine, 'collisionStart', (evt) => {
      for (const pair of evt.pairs) {
        this.handlePair('enter', pair.bodyA, pair.bodyB);
        this.handlePair('enter', pair.bodyB, pair.bodyA);
      }
    });

    Events.on(engine, 'collisionEnd', (evt) => {
      for (const pair of evt.pairs) {
        this.handlePair('exit', pair.bodyA, pair.bodyB);
        this.handlePair('exit', pair.bodyB, pair.bodyA);
      }
    });
  }

  private handlePair(eventType: 'enter' | 'exit', triggerBody: any, otherBody: any): void {
    const triggerId = getEntityId(triggerBody);
    const otherId = getEntityId(otherBody);
    if (!triggerId || !otherId) return;

    const key = `${triggerId}|${otherId}`;

    if (eventType === 'enter') {
      if (this.activePairs.has(key)) return;
      this.activePairs.add(key);
    } else {
      if (!this.activePairs.has(key)) return;
      this.activePairs.delete(key);
    }

    const world = this.worldRef;
    if (!world) return;
    this.execute(world, triggerId, otherId, eventType);
  }

  private execute(world: World, triggerEntityId: number, otherEntityId: number, eventType: 'enter' | 'exit'): void {
    const triggerEnt = world.getEntity(triggerEntityId);
    const otherEnt = world.getEntity(otherEntityId);
    if (!triggerEnt || !otherEnt) return;

    const trigger = world.getComponent(triggerEnt, TriggerZoneComponent);
    if (!trigger) return;

    if (trigger.once && this.firedOnce.has(triggerEnt.id)) return;

    const entitiesRes = world.getResource<EntitiesResource>(RES_ENTITIES);
    const audio = world.getResource<AudioApi>(RES_AUDIO_API);

    // Optional tag filter (uses EntitiesManagementSystem tags)
    if (trigger.tag && entitiesRes && !entitiesRes.hasTag(otherEnt, trigger.tag)) return;

    const actions = eventType === 'enter' ? trigger.onEnter : trigger.onExit;
    for (const a of actions) this.runAction(a, world, audio, entitiesRes, triggerEnt.id, otherEnt.id);

    if (trigger.once && eventType === 'enter') this.firedOnce.add(triggerEnt.id);
  }

  private runAction(
    action: TriggerAction,
    world: World,
    audio: AudioApi | undefined,
    entities: EntitiesResource | undefined,
    selfId: number,
    otherId: number,
  ): void {
    switch (action.type) {
      case 'PlaySound':
        audio?.play(action.soundId);
        return;
      case 'DespawnOther':
        entities?.despawnById(otherId);
        return;
      case 'DespawnSelf':
        entities?.despawnById(selfId);
        return;
      default:
        void world;
        return;
    }
  }
}

function getEntityId(body: any): number | undefined {
  const id = body?.plugin?.entityId;
  return typeof id === 'number' ? id : undefined;
}

