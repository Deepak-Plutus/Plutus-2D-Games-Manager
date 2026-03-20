import type * as PIXI from 'pixi.js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import type { EntityBase } from '../Entities/EntityBase';
import type { EntityDefinition } from '../Definitions/GameDefinition';
import { spawnEntity } from '../Definitions/spawnEntity';
import { RES_PIXI_APP } from './PixiAppSystem';

export type EntitiesResource = {
  spawn: (def: EntityDefinition) => void;
  spawnNow: (def: EntityDefinition) => EntityBase | undefined;
  despawnById: (id: number) => void;
  despawnNowById: (id: number) => void;
  despawnByName: (name: string) => void;
  findById: (id: number) => EntityBase | undefined;
  findByName: (name: string) => EntityBase | undefined;
  all: () => EntityBase[];
  tag: (entity: EntityBase, tag: string) => void;
  untag: (entity: EntityBase, tag: string) => void;
  hasTag: (entity: EntityBase, tag: string) => boolean;
  entitiesWithTag: (tag: string) => EntityBase[];
  clearTag: (tag: string) => void;
};

export const RES_ENTITIES = 'entities';

type SpawnRequest = { def: EntityDefinition };
type DespawnRequest = { id?: number; name?: string };

export class EntitiesManagementSystem extends System {
  get singletonKey(): string {
    return 'EntitiesManagementSystem';
  }

  private spawnQueue: SpawnRequest[] = [];
  private despawnQueue: DespawnRequest[] = [];

  private byName = new Map<string, number>();
  private tags = new Map<string, Set<number>>();

  update(_dt: number, world: World): void {
    if (!world.getResource<EntitiesResource>(RES_ENTITIES)) {
      world.setResource(RES_ENTITIES, this.makeResource(world));
    }

    // Keep name map warm (in case things were created by other code paths)
    for (const e of world.allEntities()) {
      if (e.name) this.byName.set(e.name, e.id);
    }

    const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
    if (!app) return;

    // Process despawns first (avoid ID reuse edge cases later)
    while (this.despawnQueue.length) {
      const req = this.despawnQueue.shift()!;
      const id = req.id ?? (req.name ? this.byName.get(req.name) : undefined);
      if (!id) continue;
      this.despawn(world, id);
    }

    // Process spawns
    while (this.spawnQueue.length) {
      const req = this.spawnQueue.shift()!;
      const ent = spawnEntity(req.def, world, app);
      if (ent) {
        this.byName.set(ent.name, ent.id);
      }
    }
  }

  private makeResource(world: World): EntitiesResource {
    return {
      spawn: (def) => this.spawnQueue.push({ def }),
      spawnNow: (def) => {
        const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
        if (!app) return undefined;
        const ent = spawnEntity(def, world, app);
        if (ent) this.byName.set(ent.name, ent.id);
        return ent;
      },
      despawnById: (id) => this.despawnQueue.push({ id }),
      despawnNowById: (id) => this.despawn(world, id),
      despawnByName: (name) => this.despawnQueue.push({ name }),
      findById: (id) => world.getEntity(id),
      findByName: (name) => {
        const id = this.byName.get(name);
        return id ? world.getEntity(id) : undefined;
      },
      all: () => [...world.allEntities()],
      tag: (entity, tag) => this.tag(entity, tag),
      untag: (entity, tag) => this.untag(entity, tag),
      hasTag: (entity, tag) => this.tags.get(tag)?.has(entity.id) ?? false,
      entitiesWithTag: (tag) => {
        const set = this.tags.get(tag);
        if (!set) return [];
        const out: EntityBase[] = [];
        for (const id of set) {
          const e = world.getEntity(id);
          if (e) out.push(e);
        }
        return out;
      },
      clearTag: (tag) => {
        this.tags.delete(tag);
      },
    };
  }

  private tag(entity: EntityBase, tag: string): void {
    let set = this.tags.get(tag);
    if (!set) {
      set = new Set();
      this.tags.set(tag, set);
    }
    set.add(entity.id);
  }

  private untag(entity: EntityBase, tag: string): void {
    this.tags.get(tag)?.delete(entity.id);
  }

  private despawn(world: World, id: number): void {
    const ent = world.removeEntity(id);
    if (!ent) return;

    // Remove from stage
    if (ent.view.parent) ent.view.parent.removeChild(ent.view);
    // Destroy display object to free GPU resources where possible
    ent.view.destroy({ children: true });

    // Name index
    if (ent.name) this.byName.delete(ent.name);

    // Tags cleanup
    for (const set of this.tags.values()) set.delete(id);
  }
}

