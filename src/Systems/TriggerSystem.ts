import { Events, Body, Vector } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { TriggerZoneComponent, type TriggerAction } from '../Components/TriggerZoneComponent';
import type { PhysicsState } from './PhysicsSystem';
import { RES_PHYSICS } from './PhysicsSystem';
import { RES_PHYSICS_API, type PhysicsApi } from './PhysicsSystem';
import type { AudioApi } from './AudioSystem';
import { RES_AUDIO_API } from './AudioSystem';
import type { EntitiesResource } from './EntitiesManagementSystem';
import { RES_ENTITIES } from './EntitiesManagementSystem';
import { HealthComponent } from '../Components/HealthComponent';
import { CoinCollectibleComponent } from '../Components/CoinCollectibleComponent';
import { RES_COINS, type CoinsState } from './CoinCollectionSystem';
import { RES_STATE_API, type StateApi } from './StateManagementSystem';
import { TagComponent } from '../Components/TagComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { TransformComponent } from '../Components/TransformComponent';

export const RES_TRIGGER_API = 'trigger_api';
export const RES_CHECKPOINT = 'checkpoint';
export type CheckpointState = { id: string };
export const RES_LEVEL_END = 'level_end';
export type LevelEndState = { ended: boolean; reason?: string };
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

    // Optional tag filter:
    // - Prefer ECS TagComponent (supports runtime add/remove on component).
    // - Fall back to EntitiesManagementSystem tags (if present).
    if (trigger.tag) {
      const tagOk = world.getComponent(otherEnt, TagComponent)?.hasTag(trigger.tag) ?? entitiesRes?.hasTag(otherEnt, trigger.tag) ?? false;
      if (!tagOk) return;
    }

    const actions = eventType === 'enter' ? trigger.onEnter(otherEnt) : trigger.onExit(otherEnt);
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
    const selfEnt = world.getEntity(selfId);
    const otherEnt = world.getEntity(otherId);

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
      case 'DamageOther': {
        if (!otherEnt) return;
        const hp = world.getComponent(otherEnt, HealthComponent);
        if (!hp) return;
        const dmg = typeof action.damage === 'number' ? action.damage : 10;
        hp.hp = Math.max(0, hp.hp - dmg);
        return;
      }
      case 'HealOther': {
        if (!otherEnt) return;
        const hp = world.getComponent(otherEnt, HealthComponent);
        if (!hp) return;
        const amt = Math.max(0, action.amount);
        hp.hp = hp.hp + amt;
        return;
      }
      case 'TeleportOther': {
        if (!otherEnt) return;
        const t = world.getComponent(otherEnt, TransformComponent);
        if (t) {
          t.position.x = action.x;
          t.position.y = action.y;
        }

        const phys = world.getComponent(otherEnt, PhysicsBodyComponent);
        if (phys) {
          Body.setPosition(phys.body, Vector.create(action.x, action.y));
          Body.setVelocity(phys.body, Vector.create(0, 0));
        }
        return;
      }
      case 'CollectCoin': {
        // CollectCoin is meant for "coin pickup" sensors:
        // - trigger entity holds CoinCollectibleComponent (selfEnt)
        // - other entity is usually the player
        const coins = world.getResource<CoinsState>(RES_COINS) ?? { total: 0 };
        if (!world.getResource<CoinsState>(RES_COINS)) world.setResource<CoinsState>(RES_COINS, coins);

        const coinComp = selfEnt ? world.getComponent(selfEnt, CoinCollectibleComponent) : undefined;
        const v = typeof action.value === 'number' ? action.value : coinComp?.value ?? 1;
        coins.total += Math.max(1, Math.floor(v));

        const despawnSelf = action.despawnSelf ?? true;
        if (despawnSelf) entities?.despawnById(selfId);
        return;
      }
      case 'SetCheckpoint': {
        world.setResource<CheckpointState>(RES_CHECKPOINT, { id: action.checkpointId });
        return;
      }
      case 'LevelEnd': {
        world.setResource<LevelEndState>(RES_LEVEL_END, { ended: true, reason: action.reason });

        const shouldPausePhysics = action.pausePhysics ?? true;
        if (shouldPausePhysics) {
          const phys = world.getResource<PhysicsApi>(RES_PHYSICS_API);
          phys?.pause();
        }

        if (action.transitionTo) {
          const stateApi = world.getResource<StateApi>(RES_STATE_API);
          stateApi?.transition(action.transitionTo, action.reason ?? 'level_end');
        } else {
          const stateApi = world.getResource<StateApi>(RES_STATE_API);
          stateApi?.transition('paused', action.reason ?? 'level_end');
        }

        const despawnSelf = action.despawnSelf ?? true;
        if (despawnSelf) entities?.despawnById(selfId);
        return;
      }
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

