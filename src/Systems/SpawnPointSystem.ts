import type { World } from "../Core/World";
import { System } from "../Core/System";
import { TransformComponent } from "../Components/TransformComponent";
import { PlayerSpawnComponent } from "../Components/PlayerSpawnComponent";
import { EnemySpawnComponent } from "../Components/EnemySpawnComponent";

export const RES_SPAWNS = "spawn_points";

export type SpawnPoint = { id: number; x: number; y: number; prefab?: string; slot?: number };
export type SpawnPointsState = {
  players: SpawnPoint[];
  enemies: SpawnPoint[];
};

export class SpawnPointSystem extends System {
  get singletonKey(): string {
    return "SpawnPointSystem";
  }

  private initialized = false;

  update(_dt: number, world: World): void {
    // Spawn markers are static, so we only build the resource once.
    if (this.initialized) return;

    let state = world.getResource<SpawnPointsState>(RES_SPAWNS);
    if (!state) {
      state = { players: [], enemies: [] };
      world.setResource<SpawnPointsState>(RES_SPAWNS, state);
    }

    for (const [e, spawn, t] of world.query(PlayerSpawnComponent, TransformComponent)) {
      const sp = spawn.spawnPoint;
      state.players.push({
        id: e.id,
        x: sp?.x ?? t.position.x,
        y: sp?.y ?? t.position.y,
        prefab: spawn.prefab,
        slot: spawn.slot,
      });
    }

    for (const [e, spawn, t] of world.query(EnemySpawnComponent, TransformComponent)) {
      state.enemies.push({
        id: e.id,
        x: t.position.x,
        y: t.position.y,
        prefab: spawn.prefab,
        slot: spawn.slot,
      });
    }

    this.initialized = true;
  }
}

