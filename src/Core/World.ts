import type { System } from './System.ts';
import type { EntityBase } from '../Entities/EntityBase';

export type ComponentCtor<T> = new (...args: any[]) => T;

export class World {
  private entities = new Map<number, EntityBase>();
  private nextEntityId = 1;

  private componentStores = new Map<ComponentCtor<any>, Map<number, any>>();
  private systems: System[] = [];
  private singletonSystems = new Map<string, System>();

  public resources = new Map<string, unknown>();

  createEntity<T extends EntityBase>(entity: T, name?: string): T {
    const id = this.nextEntityId++;
    entity.id = id;
    entity.name = name ?? entity.name ?? `entity_${id}`;
    this.entities.set(id, entity);
    return entity;
  }

  getEntity(id: number): EntityBase | undefined {
    return this.entities.get(id);
  }

  removeEntity(id: number): EntityBase | undefined {
    const ent = this.entities.get(id);
    if (!ent) return undefined;
    this.entities.delete(id);

    // Remove all components for this entity
    for (const store of this.componentStores.values()) {
      store.delete(id);
    }

    return ent;
  }

  allEntities(): Iterable<EntityBase> {
    return this.entities.values();
  }

  addSystem(system: System): void {
    const key = system.singletonKey;
    if (key) {
      const existing = this.singletonSystems.get(key);
      if (existing && existing !== system) {
        // Replace old singleton registration while preserving system order semantics
        this.removeSystem(existing);
      }
      this.singletonSystems.set(key, system);
    }
    this.systems.push(system);
    system.onAdded(this);
  }

  removeSystem(system: System): void {
    const idx = this.systems.indexOf(system);
    if (idx >= 0) this.systems.splice(idx, 1);

    const key = system.singletonKey;
    if (key && this.singletonSystems.get(key) === system) {
      this.singletonSystems.delete(key);
    }
    system.onRemoved(this);
  }

  getSystemByKey<T extends System>(key: string): T | undefined {
    return this.singletonSystems.get(key) as T | undefined;
  }

  update(dt: number): void {
    for (const s of this.systems) {
      if (!s.enabled) continue;
      s.update(dt, this);
    }
  }

  setResource<T>(key: string, value: T): void {
    this.resources.set(key, value);
  }

  getResource<T>(key: string): T | undefined {
    return this.resources.get(key) as T | undefined;
  }

  addComponent<T>(entity: EntityBase, component: T): void {
    const ctor = (component as any).constructor as ComponentCtor<T>;
    let store = this.componentStores.get(ctor);
    if (!store) {
      store = new Map<number, T>();
      this.componentStores.set(ctor, store);
    }
    store.set(entity.id, component);
  }

  removeComponent<T>(entity: EntityBase, ctor: ComponentCtor<T>): void {
    const store = this.componentStores.get(ctor);
    store?.delete(entity.id);
  }

  getComponent<T>(entity: EntityBase, ctor: ComponentCtor<T>): T | undefined {
    const store = this.componentStores.get(ctor);
    return store?.get(entity.id) as T | undefined;
  }

  hasComponent<T>(entity: EntityBase, ctor: ComponentCtor<T>): boolean {
    return this.componentStores.get(ctor)?.has(entity.id) ?? false;
  }

  *query<T extends any[]>(
    ...ctors: { [K in keyof T]: ComponentCtor<T[K]> }
  ): Generator<[EntityBase, ...T]> {
    if (ctors.length === 0) return;
    const firstStore = this.componentStores.get(ctors[0]);
    if (!firstStore) return;

    outer: for (const entityId of firstStore.keys()) {
      const entity = this.entities.get(entityId);
      if (!entity) continue;

      const comps: unknown[] = [];
      for (const ctor of ctors) {
        const store = this.componentStores.get(ctor);
        const comp = store?.get(entityId);
        if (comp === undefined) continue outer;
        comps.push(comp);
      }
      yield [entity, ...(comps as T)];
    }
  }
}

