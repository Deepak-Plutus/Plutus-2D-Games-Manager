import { System } from '../Core/System';
import type { World } from '../Core/World';
import { HealthComponent } from '../Components/HealthComponent';
import { HudStatsComponent } from '../Components/HudStatsComponent';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { RES_GAME_DEF } from './LoadingSystem';
import { RES_COINS, type CoinsState } from './CoinCollectionSystem';

/**
 * HealthHudSystem
 * Renders player health into #hud.
 */
export class HealthHudSystem extends System {
  private targetId = 'hero';
  private mounted = false;
  private showHealth = true;
  private showCoins = true;

  get singletonKey(): string {
    return 'HealthHudSystem';
  }

  update(_dt: number, world: World): void {
    if (!this.mounted) this.mount(world);

    const hud = document.querySelector<HTMLDivElement>('#hud');
    if (!hud) return;

    for (const [hudEntity] of world.query(HudStatsComponent)) {
      const cfg = world.getComponent(hudEntity, HudStatsComponent);
      if (!cfg) continue;
      this.targetId = cfg.targetId;
      this.showHealth = cfg.showHealth;
      this.showCoins = cfg.showCoins;
      break;
    }

    const parts: string[] = [];
    for (const e of world.allEntities()) {
      if (e.name !== this.targetId) continue;
      const hp = world.getComponent(e, HealthComponent);
      if (hp && this.showHealth) {
        parts.push(`Health: ${Math.round(hp.hp)} / ${Math.round(hp.maxHp)}`);
      }
      break;
    }

    if (this.showCoins) {
      const coins = world.getResource<CoinsState>(RES_COINS);
      parts.push(`Coins: ${coins?.total ?? 0}`);
    }

    hud.textContent = parts.length > 0 ? parts.join('   |   ') : 'HUD: --';
  }

  private mount(world: World): void {
    const def = world.getResource<GameDefinition>(RES_GAME_DEF);
    const followId = (def?.world?.camera as any)?.follow_entity_id;
    if (typeof followId === 'string' && followId.length > 0) this.targetId = followId;

    const hud = document.querySelector<HTMLDivElement>('#hud');
    if (hud) hud.textContent = 'HUD: --';
    this.mounted = true;
  }
}

