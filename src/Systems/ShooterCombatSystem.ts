import { System } from '../Core/System';
import type { World } from '../Core/World';
import { TransformComponent } from '../Components/TransformComponent';
import { VelocityComponent } from '../Components/VelocityComponent';
import { HealthComponent } from '../Components/HealthComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import type { EntityBase } from '../Entities/EntityBase';
import { RES_MOUSE, type MouseState } from './MouseInputSystem';
import { RES_ENTITIES, type EntitiesResource } from './EntitiesManagementSystem';
import type { EntityDefinition } from '../Definitions/GameDefinition';
import { Body } from 'matter-js';

const PLAYER_NAME = 'hero_shooter';
const ENEMY_PREFIX = 'enemy_';
const BULLET_PREFIX = 'bullet_';
export const RES_SHOOTER_STATS = 'shooter_stats';

export type ShooterStats = {
  kills: number;
};

export class ShooterCombatSystem extends System {
  get singletonKey(): string {
    return 'ShooterCombatSystem';
  }

  private fireCooldownMs = 130;
  private fireCooldownLeftMs = 0;
  private bulletSpeed = 720;
  private bulletRange = 760;
  private bulletDamage = 24;
  private bulletRadius = 6;
  private bulletCounter = 0;

  private enemySpawnEveryMs = 1400;
  private enemySpawnTimerMs = 0;
  private enemySpeed = 120;
  private enemyTouchDamagePerSec = 16;
  private enemyCollisionRadius = 24;
  private bulletCollisionRadius = 20;

  private bulletLifeByEntityId = new Map<number, number>();
  private kills = 0;
  private playerRadius = 20;

  update(dt: number, world: World): void {
    this.ensureStatsResource(world);
    const mouse = world.getResource<MouseState>(RES_MOUSE);
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    if (!mouse || !entities) return;

    const player = this.findByName(world, PLAYER_NAME);
    if (!player) return;

    const playerTransform = world.getComponent(player, TransformComponent);
    if (!playerTransform) return;

    this.clampPlayerToBounds(world, player, playerTransform);
    this.rotatePlayerTowardMouse(world, player, playerTransform, mouse);
    this.handleShooting(entities, playerTransform, mouse, dt);
    this.spawnEnemies(world, entities, playerTransform, dt);
    this.moveEnemiesTowardPlayer(world, playerTransform);
    this.resolveCombat(world, entities, player, dt);
    this.updateBulletLifetime(world, entities, dt);
  }

  private rotatePlayerTowardMouse(
    world: World,
    playerEntity: EntityBase,
    player: TransformComponent,
    mouse: MouseState,
  ): void {
    const dx = mouse.worldX - player.position.x;
    const dy = mouse.worldY - player.position.y;
    if (dx === 0 && dy === 0) return;
    const angle = Math.atan2(dy, dx);
    const body = world.getComponent(playerEntity, PhysicsBodyComponent)?.body;
    if (body) {
      Body.setAngle(body, angle);
    } else {
      player.rotation = angle;
    }
  }

  private handleShooting(
    entities: EntitiesResource,
    player: TransformComponent,
    mouse: MouseState,
    dt: number,
  ): void {
    this.fireCooldownLeftMs = Math.max(0, this.fireCooldownLeftMs - dt);
    const wantsShoot = mouse.justPressed.has(0);
    if (!wantsShoot || this.fireCooldownLeftMs > 0) return;

    const angle = Math.atan2(mouse.worldY - player.position.y, mouse.worldX - player.position.x);
    const vx = Math.cos(angle) * this.bulletSpeed;
    const vy = Math.sin(angle) * this.bulletSpeed;

    this.bulletCounter += 1;
    const def: EntityDefinition = {
      id: `${BULLET_PREFIX}${this.bulletCounter}`,
      entityType: 'Circle',
      pos: [player.position.x + Math.cos(angle) * 26, player.position.y + Math.sin(angle) * 26],
      props: { radius: this.bulletRadius, fill: 0xfbbf24 },
      components: [{ type: 'Velocity', x: vx, y: vy }],
    };

    const bullet = entities.spawnNow(def);
    if (bullet) this.bulletLifeByEntityId.set(bullet.id, this.bulletRange);
    this.fireCooldownLeftMs = this.fireCooldownMs;
  }

  private spawnEnemies(world: World, entities: EntitiesResource, player: TransformComponent, dt: number): void {
    this.enemySpawnTimerMs += dt;
    if (this.enemySpawnTimerMs < this.enemySpawnEveryMs) return;
    this.enemySpawnTimerMs = 0;

    const bounds = this.worldBounds(world);
    const edge = Math.floor(Math.random() * 4);
    let x = player.position.x;
    let y = player.position.y;

    if (edge === 0) {
      x = bounds.minX;
      y = rand(bounds.minY, bounds.maxY);
    } else if (edge === 1) {
      x = bounds.maxX;
      y = rand(bounds.minY, bounds.maxY);
    } else if (edge === 2) {
      x = rand(bounds.minX, bounds.maxX);
      y = bounds.minY;
    } else {
      x = rand(bounds.minX, bounds.maxX);
      y = bounds.maxY;
    }

    const id = `${ENEMY_PREFIX}${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    entities.spawn({
      id,
      prefab: 'enemy_sprite_2d',
      pos: [x, y],
      width: 42,
      height: 42,
      components: [
        { type: 'Velocity', x: 0, y: 0 },
        { type: 'Health', hp: 80, maxHp: 80 },
      ],
    });
  }

  private moveEnemiesTowardPlayer(world: World, player: TransformComponent): void {
    for (const [entity, transform, velocity] of world.query(TransformComponent, VelocityComponent)) {
      if (!entity.name.startsWith(ENEMY_PREFIX)) continue;
      const dx = player.position.x - transform.position.x;
      const dy = player.position.y - transform.position.y;
      const len = Math.hypot(dx, dy);
      if (len <= 0.0001) {
        velocity.x = 0;
        velocity.y = 0;
        continue;
      }
      velocity.x = (dx / len) * this.enemySpeed;
      velocity.y = (dy / len) * this.enemySpeed;
    }
  }

  private resolveCombat(world: World, entities: EntitiesResource, playerEntity: EntityBase, dt: number): void {
    const playerHp = world.getComponent(playerEntity, HealthComponent);
    const playerTransform = world.getComponent(playerEntity, TransformComponent);
    if (!playerHp || !playerTransform) return;

    const enemies: Array<{ entity: EntityBase; transform: TransformComponent; hp: HealthComponent }> = [];
    for (const [entity, transform, hp] of world.query(TransformComponent, HealthComponent)) {
      if (!entity.name.startsWith(ENEMY_PREFIX)) continue;
      enemies.push({ entity, transform, hp });
    }

    // Bullet -> enemy hits.
    for (const [bullet, bulletTransform] of world.query(TransformComponent)) {
      if (!bullet.name.startsWith(BULLET_PREFIX)) continue;
      for (const enemy of enemies) {
        const dx = bulletTransform.position.x - enemy.transform.position.x;
        const dy = bulletTransform.position.y - enemy.transform.position.y;
        if (dx * dx + dy * dy > this.bulletCollisionRadius * this.bulletCollisionRadius) continue;
        const hpBefore = enemy.hp.hp;
        enemy.hp.hp = enemy.hp.hp - this.bulletDamage;
        if (hpBefore > 0 && enemy.hp.hp <= 0) {
          this.kills += 1;
          this.setStats(world);
        }
        entities.despawnById(bullet.id);
        this.bulletLifeByEntityId.delete(bullet.id);
        break;
      }
    }

    // Enemy -> player touch damage.
    for (const enemy of enemies) {
      const dx = playerTransform.position.x - enemy.transform.position.x;
      const dy = playerTransform.position.y - enemy.transform.position.y;
      if (dx * dx + dy * dy > this.enemyCollisionRadius * this.enemyCollisionRadius) continue;
      playerHp.hp = playerHp.hp - (this.enemyTouchDamagePerSec * dt) / 1000;
    }
  }

  private updateBulletLifetime(world: World, entities: EntitiesResource, dt: number): void {
    const validBulletIds = new Set<number>();
    for (const [bullet] of world.query(TransformComponent)) {
      if (!bullet.name.startsWith(BULLET_PREFIX)) continue;
      validBulletIds.add(bullet.id);
      const left = (this.bulletLifeByEntityId.get(bullet.id) ?? this.bulletRange) - (this.bulletSpeed * dt) / 1000;
      if (left <= 0) {
        entities.despawnById(bullet.id);
        this.bulletLifeByEntityId.delete(bullet.id);
      } else {
        this.bulletLifeByEntityId.set(bullet.id, left);
      }
    }

    for (const id of this.bulletLifeByEntityId.keys()) {
      if (!validBulletIds.has(id)) this.bulletLifeByEntityId.delete(id);
    }
  }

  private findByName(world: World, name: string): EntityBase | undefined {
    for (const entity of world.allEntities()) {
      if (entity.name === name) return entity;
    }
    return undefined;
  }

  private worldBounds(world: World): { minX: number; maxX: number; minY: number; maxY: number } {
    const def = world.getResource<any>('game_def');
    const raw = def?.world?.bounds;
    if (Array.isArray(raw) && raw.length >= 4) {
      const x = Number(raw[0]);
      const y = Number(raw[1]);
      const w = Number(raw[2]);
      const h = Number(raw[3]);
      if ([x, y, w, h].every((n) => Number.isFinite(n))) {
        return { minX: x, maxX: x + w, minY: y, maxY: y + h };
      }
    }
    return { minX: 0, maxX: 1920, minY: 0, maxY: 1080 };
  }

  private clampPlayerToBounds(world: World, playerEntity: EntityBase, playerTransform: TransformComponent): void {
    const bounds = this.worldBounds(world);
    const minX = bounds.minX + this.playerRadius;
    const maxX = bounds.maxX - this.playerRadius;
    const minY = bounds.minY + this.playerRadius;
    const maxY = bounds.maxY - this.playerRadius;

    const clampedX = clamp(playerTransform.position.x, minX, maxX);
    const clampedY = clamp(playerTransform.position.y, minY, maxY);

    const body = world.getComponent(playerEntity, PhysicsBodyComponent)?.body;
    if (body) {
      if (clampedX !== playerTransform.position.x || clampedY !== playerTransform.position.y) {
        Body.setPosition(body, { x: clampedX, y: clampedY });
        // Cancel outward drift at the boundary.
        Body.setVelocity(body, { x: 0, y: 0 });
      }
      return;
    }

    playerTransform.position.x = clampedX;
    playerTransform.position.y = clampedY;
  }

  private ensureStatsResource(world: World): void {
    if (!world.getResource<ShooterStats>(RES_SHOOTER_STATS)) {
      world.setResource<ShooterStats>(RES_SHOOTER_STATS, { kills: this.kills });
    }
  }

  private setStats(world: World): void {
    const stats = world.getResource<ShooterStats>(RES_SHOOTER_STATS);
    if (stats) {
      stats.kills = this.kills;
    } else {
      world.setResource<ShooterStats>(RES_SHOOTER_STATS, { kills: this.kills });
    }
  }
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
