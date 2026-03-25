import { Events } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { CoinCollectibleComponent } from '../Components/CoinCollectibleComponent';
import type { PhysicsState } from './PhysicsSystem';
import { RES_PHYSICS } from './PhysicsSystem';
import type { EntitiesResource } from './EntitiesManagementSystem';
import { RES_ENTITIES } from './EntitiesManagementSystem';

export const RES_COINS = 'coins';
export type CoinsState = { total: number };

export class CoinCollectionSystem extends System {
  private attached = false;
  private worldRef?: World;

  update(_dt: number, world: World): void {
    this.worldRef = world;
    if (!world.getResource<CoinsState>(RES_COINS)) {
      world.setResource<CoinsState>(RES_COINS, { total: 0 });
    }

    const phys = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!phys || this.attached) return;

    Events.on(phys.engine, 'collisionStart', (evt) => {
      const w = this.worldRef;
      if (!w) return;
      for (const pair of evt.pairs) {
        this.tryCollect(w, pair.bodyA, pair.bodyB);
        this.tryCollect(w, pair.bodyB, pair.bodyA);
      }
    });
    this.attached = true;
  }

  private tryCollect(world: World, coinBody: any, collectorBody: any): void {
    const coinId = coinBody?.plugin?.entityId;
    const collectorId = collectorBody?.plugin?.entityId;
    if (typeof coinId !== 'number' || typeof collectorId !== 'number') return;

    const coinEnt = world.getEntity(coinId);
    const collectorEnt = world.getEntity(collectorId);
    if (!coinEnt || !collectorEnt) return;
    if (collectorEnt.name !== 'hero') return;

    const coin = world.getComponent(coinEnt, CoinCollectibleComponent);
    if (!coin) return;

    // Mirror doc-specified helpers first (side effects are safe even if
    // CoinsState is what actually updates HUD).
    coin.collect(collectorEnt);
    coin.addScore(coin.value);

    const coins = world.getResource<CoinsState>(RES_COINS);
    if (coins) coins.total += Math.max(1, Math.floor(coin.value));

    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    entities?.despawnById(coinEnt.id);
    coin.destroy();
  }
}
