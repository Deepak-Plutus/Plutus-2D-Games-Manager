import { System } from '../Core/System';
import type { World } from '../Core/World';
import { HealthComponent } from '../Components/HealthComponent';
import { HudStatsComponent } from '../Components/HudStatsComponent';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { RES_GAME_DEF } from './LoadingSystem';
import { RES_COINS, type CoinsState } from './CoinCollectionSystem';
import { RES_SHOOTER_STATS, type ShooterStats } from './ShooterCombatSystem';
import { RES_SPACE_BULLET_HELL_STATS, type SpaceBulletHellStats } from './SpaceBulletHellSystem';

/**
 * HealthHudSystem
 * Renders player health into #hud.
 */
export class HealthHudSystem extends System {
  private targetId = 'hero';
  private mounted = false;
  private showHealth = true;
  private showCoins = true;
  private showEnemyCount = false;
  private showScore = false;
  private enemyPrefix = 'enemy_';

  get singletonKey(): string {
    return 'HealthHudSystem';
  }

  update(_dt: number, world: World): void {
    if (!this.mounted) this.mount(world);

    const statsHost = document.querySelector<HTMLDivElement>('#hud-stats');
    if (!statsHost) return;

    for (const [hudEntity] of world.query(HudStatsComponent)) {
      const cfg = world.getComponent(hudEntity, HudStatsComponent);
      if (!cfg) continue;
      this.targetId = cfg.targetId;
      this.showHealth = cfg.showHealth;
      this.showCoins = cfg.showCoins;
      this.showEnemyCount = cfg.showEnemyCount;
      this.showScore = cfg.showScore;
      this.enemyPrefix = cfg.enemyPrefix;
      break;
    }

    const parts: string[] = [];
    for (const e of world.allEntities()) {
      if (e.name !== this.targetId) continue;
      const hp = world.getComponent(e, HealthComponent);
      if (hp && this.showHealth) {
        parts.push(
          `<span class="chip chip-health"><span class="label">Health</span><span class="value">${Math.round(hp.hp)} / ${Math.round(hp.maxHp)}</span></span>`,
        );
      }
      break;
    }

    if (this.showCoins) {
      const coins = world.getResource<CoinsState>(RES_COINS);
      parts.push(`<span class="chip chip-coins"><span class="label">Coins</span><span class="value">${coins?.total ?? 0}</span></span>`);
    }

    if (this.showEnemyCount) {
      const shooter = world.getResource<ShooterStats>(RES_SHOOTER_STATS);
      if (shooter) {
        parts.push(
          `<span class="chip chip-enemy"><span class="label">Enemies Killed</span><span class="value">${shooter.kills}</span></span>`,
        );
      } else {
        let enemies = 0;
        for (const e of world.allEntities()) {
          if (e.name.startsWith(this.enemyPrefix) && world.getComponent(e, HealthComponent)) enemies += 1;
        }
        parts.push(`<span class="chip chip-enemy"><span class="label">Enemies</span><span class="value">${enemies}</span></span>`);
      }
    }

    if (this.showScore) {
      const score = world.getResource<SpaceBulletHellStats>(RES_SPACE_BULLET_HELL_STATS);
      parts.push(`<span class="chip chip-score"><span class="label">Score</span><span class="value">${score?.score ?? 0}</span></span>`);
    }

    statsHost.innerHTML = parts.length > 0 ? parts.join('') : 'HUD: --';
  }

  private mount(world: World): void {
    const def = world.getResource<GameDefinition>(RES_GAME_DEF);
    const followId = (def?.world?.camera as any)?.follow_entity_id;
    if (typeof followId === 'string' && followId.length > 0) this.targetId = followId;

    const hud = document.querySelector<HTMLDivElement>('#hud');
    if (hud) {
      hud.classList.remove('hud-platformer', 'hud-shooter');
      hud.classList.add(def?.genre === 'shoot_em_up' ? 'hud-shooter' : 'hud-platformer');
    }
    const statsHost = document.querySelector<HTMLDivElement>('#hud-stats');
    if (statsHost) statsHost.textContent = 'HUD: --';
    this.mounted = true;
  }
}

