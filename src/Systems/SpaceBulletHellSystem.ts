import { System } from "../Core/System";
import type { World } from "../Core/World";
import { TransformComponent } from "../Components/TransformComponent";
import { HealthComponent } from "../Components/HealthComponent";
import type { EntityBase } from "../Entities/EntityBase";
import { RES_INPUT, type InputState } from "./InputSystem";
import { RES_ENTITIES, type EntitiesResource } from "./EntitiesManagementSystem";
import type { EntityDefinition } from "../Definitions/GameDefinition";
import { RES_PIXI_APP } from "./PixiAppSystem";
import type * as PIXI from "pixi.js";

const PLAYER_ID = "space_player";
const ENEMY_PREFIX = "space_enemy_";
const BULLET_PREFIX = "space_bullet_";
const BOSS_BULLET_PREFIX = "space_boss_bullet_";
const BOSS_ID = "space_boss";
export const RES_SPACE_BULLET_HELL_STATS = "space_bullet_hell_stats";

export type SpaceBulletHellStats = {
  score: number;
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export class SpaceBulletHellSystem extends System {
  get singletonKey(): string {
    return "SpaceBulletHellSystem";
  }

  private readonly cols = 11;
  private readonly rows = 11;
  private readonly maxEnemyRows = 10;
  private enemyRowsSpawned = 0;
  private bossSpawned = false;

  private playerCol = Math.floor(this.cols / 2);
  private playerRow = this.rows - 1;

  private bulletCounter = 0;
  private bossBulletCounter = 0;
  private enemyCounter = 0;

  private fireCooldownMs = 140;
  private fireElapsedMs = 0;
  private rowSpawnEveryMs = 1800;
  private rowSpawnElapsedMs = 0;
  private enemyStepEveryMs = 600;
  private enemyStepElapsedMs = 0;
  private enemyStepSizeCells = 0.5;
  private contactCooldownMs = 260;
  private enemyContactUntil = new Map<number, number>();
  private bossFireEveryMs = 550;
  private bossFireElapsedMs = 0;
  private bossDirX = Math.random() < 0.5 ? -1 : 1;
  private bossMoveSpeed = 90;
  private enemyCollisionDamage = 10;
  private score = 0;
  private nowMs = 0;

  update(dt: number, world: World): void {
    this.nowMs += dt;
    this.ensureStatsResource(world);
    this.enforceFixedCamera(world);
    this.applyWorldTuning(world);
    const input = world.getResource<InputState>(RES_INPUT);
    const entities = world.getResource<EntitiesResource>(RES_ENTITIES);
    if (!input || !entities) return;

    const bounds = this.worldBounds(world);
    const player = this.findByName(world, PLAYER_ID);
    if (!player) return;
    const playerTransform = world.getComponent(player, TransformComponent);
    if (!playerTransform) return;

    this.applyGridPlayerMove(input, playerTransform, bounds);
    this.keepPlayerInsideBounds(playerTransform, bounds);

    this.fireElapsedMs += dt;
    if (this.fireElapsedMs >= this.fireCooldownMs) {
      this.fireElapsedMs = 0;
      this.spawnPlayerBullet(entities, playerTransform);
    }

    this.rowSpawnElapsedMs += dt;
    if (!this.bossSpawned && this.enemyRowsSpawned < this.maxEnemyRows && this.rowSpawnElapsedMs >= this.rowSpawnEveryMs) {
      this.rowSpawnElapsedMs = 0;
      this.spawnEnemyRow(world, entities, bounds);
      this.enemyRowsSpawned += 1;
    }

    // Clear regular enemies that moved out through bottom.
    this.cleanupEnemiesPastBottom(world, entities, bounds);
    this.handleWaveLoopReset(world);

    // Boss appears only after all planned rows have spawned
    // AND no regular enemies remain alive (destroyed or moved out).
    if (!this.bossSpawned && this.enemyRowsSpawned >= this.maxEnemyRows && this.countAliveRegularEnemies(world) === 0) {
      this.spawnBoss(world, entities, bounds);
      this.bossSpawned = true;
    }

    this.enemyStepElapsedMs += dt;
    if (this.enemyStepElapsedMs >= this.enemyStepEveryMs) {
      this.enemyStepElapsedMs = 0;
      this.stepEnemiesDown(world, bounds);
    }

    this.updateBossMovement(world, bounds, dt);
    this.updateBossFire(world, entities, dt);
    this.applyShipRotations(world);
    this.handleBulletHits(world, entities);
    this.handleEnemyPlayerContact(world);
    this.cleanupFarBullets(world, entities, bounds);
  }

  private applyGridPlayerMove(input: InputState, playerTransform: TransformComponent, bounds: Bounds): void {
    const cellW = (bounds.maxX - bounds.minX) / this.cols;
    const cellH = (bounds.maxY - bounds.minY) / this.rows;

    const left = input.justPressed.has("ArrowLeft") || input.justPressed.has("KeyA");
    const right = input.justPressed.has("ArrowRight") || input.justPressed.has("KeyD");
    const up = input.justPressed.has("ArrowUp") || input.justPressed.has("KeyW");
    const down = input.justPressed.has("ArrowDown") || input.justPressed.has("KeyS");

    if (left) this.playerCol -= 1;
    if (right) this.playerCol += 1;
    if (up) this.playerRow -= 1;
    if (down) this.playerRow += 1;

    this.playerCol = clampInt(this.playerCol, 0, this.cols - 1);
    this.playerRow = clampInt(this.playerRow, 0, this.rows - 1);

    playerTransform.position.x = bounds.minX + cellW * (this.playerCol + 0.5);
    playerTransform.position.y = bounds.minY + cellH * (this.playerRow + 0.5);
  }

  private keepPlayerInsideBounds(playerTransform: TransformComponent, bounds: Bounds): void {
    playerTransform.position.x = clamp(playerTransform.position.x, bounds.minX + 2, bounds.maxX - 2);
    playerTransform.position.y = clamp(playerTransform.position.y, bounds.minY + 2, bounds.maxY - 2);
  }

  private spawnPlayerBullet(entities: EntitiesResource, playerTransform: TransformComponent): void {
    this.bulletCounter += 1;
    const def: EntityDefinition = {
      id: `${BULLET_PREFIX}${this.bulletCounter}`,
      entityType: "Circle",
      pos: [playerTransform.position.x, playerTransform.position.y - 20],
      props: { radius: 4, fill: 0x93c5fd },
      components: [{ type: "Velocity", x: 0, y: -320 }],
    };
    entities.spawn(def);
  }

  private spawnEnemyRow(world: World, entities: EntitiesResource, bounds: Bounds): void {
    const enemyPrefab = this.enemyPrefabId(world);
    const cellW = (bounds.maxX - bounds.minX) / this.cols;
    const spawnY = bounds.minY - ((bounds.maxY - bounds.minY) / this.rows) * 0.6;
    for (let col = 0; col < this.cols; col += 1) {
      this.enemyCounter += 1;
      const x = bounds.minX + cellW * (col + 0.5);
      entities.spawn({
        id: `${ENEMY_PREFIX}${this.enemyCounter}`,
        prefab: enemyPrefab,
        pos: [x, spawnY],
        width: 42,
        height: 42,
        components: [
          { type: "Velocity", x: 0, y: 0 },
          { type: "Health", hp: 30, maxHp: 30 },
        ],
      });
    }
  }

  private spawnBoss(world: World, entities: EntitiesResource, bounds: Bounds): void {
    const bossPrefab = this.bossPrefabId(world);
    const x = (bounds.minX + bounds.maxX) * 0.5;
    const y = bounds.minY - 40;
    entities.spawn({
      id: BOSS_ID,
      prefab: bossPrefab,
      pos: [x, y],
      width: 132,
      height: 72,
      components: [
        { type: "Velocity", x: 0, y: 0 },
        { type: "Health", hp: 320, maxHp: 320 },
      ],
    });
  }

  private stepEnemiesDown(world: World, bounds: Bounds): void {
    const cellW = (bounds.maxX - bounds.minX) / this.cols;
    const cellH = (bounds.maxY - bounds.minY) / this.rows;
    const stepPx = cellH * this.enemyStepSizeCells;
    const minGap = cellH * 0.9;
    const byCol = new Map<number, Array<TransformComponent>>();

    for (const [entity, transform] of world.query(TransformComponent)) {
      if (!entity.name.startsWith(ENEMY_PREFIX) && entity.name !== BOSS_ID) continue;
      transform.position.y += stepPx;

      // Group by nearest grid column so we can enforce vertical spacing.
      const rawCol = Math.floor((transform.position.x - bounds.minX) / cellW);
      const col = clampInt(rawCol, 0, this.cols - 1);
      let arr = byCol.get(col);
      if (!arr) {
        arr = [];
        byCol.set(col, arr);
      }
      arr.push(transform);
    }

    // Ensure no overlaps inside each column (top to bottom).
    for (const transforms of byCol.values()) {
      transforms.sort((a, b) => a.position.y - b.position.y);
      for (let i = 1; i < transforms.length; i += 1) {
        const prev = transforms[i - 1];
        const cur = transforms[i];
        const minY = prev.position.y + minGap;
        if (cur.position.y < minY) {
          cur.position.y = minY;
        }
      }
    }
  }

  private handleBulletHits(world: World, entities: EntitiesResource): void {
    const targets: Array<{ entity: EntityBase; transform: TransformComponent; hp: HealthComponent }> = [];
    for (const [entity, transform, hp] of world.query(TransformComponent, HealthComponent)) {
      if (entity.name.startsWith(ENEMY_PREFIX) || entity.name === BOSS_ID) {
        targets.push({ entity, transform, hp });
      }
    }

    for (const [bullet, bulletTransform] of world.query(TransformComponent)) {
      if (!bullet.name.startsWith(BULLET_PREFIX)) continue;
      for (const t of targets) {
        const dx = bulletTransform.position.x - t.transform.position.x;
        const dy = bulletTransform.position.y - t.transform.position.y;
        const hitRadius = t.entity.name === BOSS_ID ? 38 : 18;
        if (dx * dx + dy * dy > hitRadius * hitRadius) continue;
        const hpBefore = t.hp.hp;
        t.hp.hp = t.hp.hp - 10;
        if (hpBefore > 0 && t.hp.hp <= 0) {
          this.score += t.entity.name === BOSS_ID ? 300 : 10;
          this.setStats(world);
        }
        entities.despawnById(bullet.id);
        break;
      }
    }

    // Boss bullet -> player
    const player = this.findByName(world, PLAYER_ID);
    const playerTransform = player ? world.getComponent(player, TransformComponent) : undefined;
    const playerHealth = player ? world.getComponent(player, HealthComponent) : undefined;
    if (playerTransform && playerHealth) {
      for (const [bullet, bulletTransform] of world.query(TransformComponent)) {
        if (!bullet.name.startsWith(BOSS_BULLET_PREFIX)) continue;
        const dx = bulletTransform.position.x - playerTransform.position.x;
        const dy = bulletTransform.position.y - playerTransform.position.y;
        if (dx * dx + dy * dy > 18 * 18) continue;
        playerHealth.hp = playerHealth.hp - 12;
        entities.despawnById(bullet.id);
      }
    }
  }

  private handleEnemyPlayerContact(world: World): void {
    const player = this.findByName(world, PLAYER_ID);
    if (!player) return;
    const playerTransform = world.getComponent(player, TransformComponent);
    const playerHealth = world.getComponent(player, HealthComponent);
    if (!playerTransform) return;
    if (!playerHealth) return;

    for (const [entity, transform] of world.query(TransformComponent, HealthComponent)) {
      if (!entity.name.startsWith(ENEMY_PREFIX) && entity.name !== BOSS_ID) continue;
      const dx = playerTransform.position.x - transform.position.x;
      const dy = playerTransform.position.y - transform.position.y;
      const radius = entity.name === BOSS_ID ? 40 : 20;
      if (dx * dx + dy * dy > radius * radius) continue;

      const until = this.enemyContactUntil.get(entity.id) ?? 0;
      if (this.nowMs < until) continue;
      this.enemyContactUntil.set(entity.id, this.nowMs + this.contactCooldownMs);
      playerHealth.hp = playerHealth.hp - this.enemyCollisionDamage;
    }
  }

  private cleanupFarBullets(world: World, entities: EntitiesResource, bounds: Bounds): void {
    for (const [bullet, transform] of world.query(TransformComponent)) {
      if (bullet.name.startsWith(BULLET_PREFIX)) {
        if (transform.position.y < bounds.minY - 80) {
          entities.despawnById(bullet.id);
        }
        continue;
      }
      if (bullet.name.startsWith(BOSS_BULLET_PREFIX)) {
        if (transform.position.y > bounds.maxY + 80) {
          entities.despawnById(bullet.id);
        }
      }
    }
  }

  private cleanupEnemiesPastBottom(world: World, entities: EntitiesResource, bounds: Bounds): void {
    for (const [entity, transform] of world.query(TransformComponent)) {
      if (!entity.name.startsWith(ENEMY_PREFIX)) continue;
      if (transform.position.y <= bounds.maxY + 36) continue;
      entities.despawnById(entity.id);
    }
  }

  private handleWaveLoopReset(world: World): void {
    // When boss is dead/despawned, start next cycle:
    // spawn enemy rows again, then boss again.
    if (!this.bossSpawned) return;
    const bossAlive = this.findByName(world, BOSS_ID);
    if (bossAlive) return;

    this.enemyRowsSpawned = 0;
    this.bossSpawned = false;
    this.rowSpawnElapsedMs = 0;
    this.enemyStepElapsedMs = 0;
    this.bossFireElapsedMs = 0;
    this.bossDirX = Math.random() < 0.5 ? -1 : 1;
  }

  private updateBossFire(world: World, entities: EntitiesResource, dt: number): void {
    const boss = this.findByName(world, BOSS_ID);
    if (!boss) return;
    const bossTransform = world.getComponent(boss, TransformComponent);
    if (!bossTransform) return;
    const bounds = this.worldBounds(world);
    const halfW = Math.max(16, boss.view.width * 0.5);
    const halfH = Math.max(16, boss.view.height * 0.5);
    const inView =
      bossTransform.position.x + halfW >= bounds.minX &&
      bossTransform.position.x - halfW <= bounds.maxX &&
      bossTransform.position.y + halfH >= bounds.minY &&
      bossTransform.position.y - halfH <= bounds.maxY;
    if (!inView) return;

    this.bossFireElapsedMs += dt;
    if (this.bossFireElapsedMs < this.bossFireEveryMs) return;
    this.bossFireElapsedMs = 0;

    const speed = 220;
    for (const offset of [-18, 0, 18]) {
      this.bossBulletCounter += 1;
      entities.spawn({
        id: `${BOSS_BULLET_PREFIX}${this.bossBulletCounter}`,
        entityType: "Circle",
        pos: [bossTransform.position.x + offset, bossTransform.position.y + 22],
        props: { radius: 4, fill: 0xf87171 },
        components: [{ type: "Velocity", x: 0, y: speed }],
      });
    }
  }

  private updateBossMovement(world: World, bounds: Bounds, dt: number): void {
    const boss = this.findByName(world, BOSS_ID);
    if (!boss) return;
    const bossTransform = world.getComponent(boss, TransformComponent);
    if (!bossTransform) return;

    const halfWidth = Math.max(20, boss.view.width * 0.5);
    const minX = bounds.minX + halfWidth;
    const maxX = bounds.maxX - halfWidth;

    bossTransform.position.x += this.bossDirX * this.bossMoveSpeed * (dt / 1000);
    if (bossTransform.position.x <= minX) {
      bossTransform.position.x = minX;
      this.bossDirX = 1;
    } else if (bossTransform.position.x >= maxX) {
      bossTransform.position.x = maxX;
      this.bossDirX = -1;
    }
  }

  private applyShipRotations(world: World): void {
    for (const [entity, transform] of world.query(TransformComponent)) {
      if (entity.name.startsWith(ENEMY_PREFIX)) {
        transform.rotation = Math.PI; // face downward
      } else if (entity.name === PLAYER_ID || entity.name === BOSS_ID) {
        transform.rotation = 0; // no rotation for player and boss
      }
    }
  }

  private findByName(world: World, name: string): EntityBase | undefined {
    for (const entity of world.allEntities()) {
      if (entity.name === name) return entity;
    }
    return undefined;
  }

  private countAliveRegularEnemies(world: World): number {
    let count = 0;
    for (const [entity, hp] of world.query(HealthComponent)) {
      if (!entity.name.startsWith(ENEMY_PREFIX)) continue;
      if (hp.hp > 0) count += 1;
    }
    return count;
  }

  private worldBounds(world: World): Bounds {
    const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
    if (app) {
      return { minX: 0, minY: 0, maxX: app.screen.width, maxY: app.screen.height };
    }

    const def = world.getResource<any>("game_def");
    const raw = def?.world?.bounds;
    if (Array.isArray(raw) && raw.length >= 4) {
      const x = Number(raw[0]);
      const y = Number(raw[1]);
      const w = Number(raw[2]);
      const h = Number(raw[3]);
      if ([x, y, w, h].every((n) => Number.isFinite(n))) {
        return { minX: x, minY: y, maxX: x + w, maxY: y + h };
      }
    }
    return { minX: 0, minY: 0, maxX: 390, maxY: 844 };
  }

  private enforceFixedCamera(world: World): void {
    const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
    if (!app) return;
    app.stage.pivot.set(0, 0);
    app.stage.position.set(0, 0);
    app.stage.scale.set(1, 1);
  }

  private applyWorldTuning(world: World): void {
    const def = world.getResource<any>("game_def");
    const fromJson = Number(def?.world?.enemyStepEveryMs);
    if (Number.isFinite(fromJson) && fromJson > 50) {
      this.enemyStepEveryMs = fromJson;
    }
    const collisionDmg = Number(def?.world?.enemyCollisionDamage);
    if (Number.isFinite(collisionDmg) && collisionDmg >= 0) {
      this.enemyCollisionDamage = collisionDmg;
    }
  }

  private ensureStatsResource(world: World): void {
    if (!world.getResource<SpaceBulletHellStats>(RES_SPACE_BULLET_HELL_STATS)) {
      world.setResource<SpaceBulletHellStats>(RES_SPACE_BULLET_HELL_STATS, { score: this.score });
    }
  }

  private setStats(world: World): void {
    const stats = world.getResource<SpaceBulletHellStats>(RES_SPACE_BULLET_HELL_STATS);
    if (stats) {
      stats.score = this.score;
    } else {
      world.setResource<SpaceBulletHellStats>(RES_SPACE_BULLET_HELL_STATS, { score: this.score });
    }
  }

  private enemyPrefabId(world: World): string {
    const def = world.getResource<any>("game_def");
    const prefab = def?.world?.enemyPrefab;
    return typeof prefab === "string" && prefab.length > 0 ? prefab : "enemy_ship";
  }

  private bossPrefabId(world: World): string {
    const def = world.getResource<any>("game_def");
    const prefab = def?.world?.bossPrefab;
    return typeof prefab === "string" && prefab.length > 0 ? prefab : "boss_enemy_ship";
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}
