import Matter, { Engine, World as MatterWorld, Body, Bodies } from 'matter-js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { TransformComponent } from '../Components/TransformComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { RES_GAME_DEF } from './LoadingSystem';

export type PhysicsConfig = {
  gravity?: { x: number; y: number; scale?: number };
  enableSleeping?: boolean;
  velocityIterations?: number;
  positionIterations?: number;
  createFloorFromBounds?: boolean;
  floorThickness?: number;
};

export type PhysicsState = {
  engine: Engine;
};

export const RES_PHYSICS = 'physics';
export const RES_PHYSICS_API = 'physics_api';

export type PhysicsApi = {
  getEngine: () => Engine | undefined;
  getGravity: () => { x: number; y: number; scale: number } | undefined;
  setGravity: (x: number, y: number, scale?: number) => void;
  addBody: (body: Body) => void;
  removeBody: (body: Body) => void;
  pause: () => void;
  resume: () => void;
  isPaused: () => boolean;
  step: (dtMs: number) => void;
};

/**
 * PhysicsSystem (Matter.js)
 * - Owns a Matter Engine and steps it each frame
 * - Syncs Matter bodies -> TransformComponent
 *
 * Bodies are created by the JSON component factory (see registries.ts "PhysicsBody").
 */
export class PhysicsSystem extends System {
  private initialized = false;
  private floorCreated = false;
  private worldRef?: World;
  private paused = false;

  get singletonKey(): string {
    return 'PhysicsSystem';
  }

  update(dt: number, world: World): void {
    this.worldRef = world;
    const state = this.ensureState(world);
    if (!state) return;

    if (!this.initialized) {
      this.applyConfigFromDefinition(world, state);
      this.initialized = true;
    }

    if (!world.getResource<PhysicsApi>(RES_PHYSICS_API)) {
      world.setResource(RES_PHYSICS_API, {
        getEngine: () => this.getEngine(),
        getGravity: () => this.getGravity(),
        setGravity: (x: number, y: number, scale?: number) => this.setGravity(x, y, scale),
        addBody: (body: Body) => this.addBody(body),
        removeBody: (body: Body) => this.removeBody(body),
        pause: () => this.pause(),
        resume: () => this.resume(),
        isPaused: () => this.isPaused(),
        step: (dtMs: number) => this.step(dtMs),
      });
    }

    // Matter expects dt in ms
    if (!this.paused) {
      Engine.update(state.engine, dt);
    }

    // Sync physics -> transform
    for (const [, transform, phys] of world.query(TransformComponent, PhysicsBodyComponent)) {
      const b = phys.body;
      transform.position.x = b.position.x;
      transform.position.y = b.position.y;
      transform.rotation = b.angle;
    }
  }

  private ensureState(world: World): PhysicsState | undefined {
    let state = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!state) {
      const engine = Engine.create({ enableSleeping: false });
      state = { engine };
      world.setResource(RES_PHYSICS, state);
    }
    return state;
  }

  getEngine(): Engine | undefined {
    return this.worldRef?.getResource<PhysicsState>(RES_PHYSICS)?.engine;
  }

  getGravity(): { x: number; y: number; scale: number } | undefined {
    const g = this.getEngine()?.gravity;
    if (!g) return undefined;
    return { x: g.x, y: g.y, scale: g.scale };
  }

  setGravity(x: number, y: number, scale?: number): void {
    const g = this.getEngine()?.gravity;
    if (!g) return;
    g.x = x;
    g.y = y;
    if (typeof scale === 'number') g.scale = scale;
  }

  addBody(body: Body): void {
    const engine = this.getEngine();
    if (!engine) return;
    MatterWorld.add(engine.world, body);
  }

  removeBody(body: Body): void {
    const engine = this.getEngine();
    if (!engine) return;
    MatterWorld.remove(engine.world, body);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  step(dtMs: number): void {
    const engine = this.getEngine();
    if (!engine) return;
    Engine.update(engine, dtMs);
  }

  private applyConfigFromDefinition(world: World, state: PhysicsState): void {
    const def = world.getResource<GameDefinition>(RES_GAME_DEF);
    const cfg = (def?.world?.physics as PhysicsConfig | undefined) ?? undefined;
    const createFloor = cfg?.createFloorFromBounds ?? true;

    if (cfg?.gravity) {
      state.engine.gravity.x = cfg.gravity.x;
      state.engine.gravity.y = cfg.gravity.y;
      if (typeof cfg.gravity.scale === 'number') state.engine.gravity.scale = cfg.gravity.scale;
    }
    if (typeof cfg?.enableSleeping === 'boolean') {
      state.engine.enableSleeping = cfg.enableSleeping;
    }
    if (typeof cfg?.velocityIterations === 'number') {
      state.engine.velocityIterations = cfg.velocityIterations;
    }
    if (typeof cfg?.positionIterations === 'number') {
      state.engine.positionIterations = cfg.positionIterations;
    }

    // Provide a sane default floor using `world.bounds` if present.
    // This makes JSON-only platformers playable without explicitly defining a ground entity.
    if (createFloor && !this.floorCreated) {
      const bounds = def?.world?.bounds;
      if (Array.isArray(bounds) && bounds.length >= 4) {
        const bx = Number(bounds[0]);
        const by = Number(bounds[1]);
        const bw = Number(bounds[2]);
        const bh = Number(bounds[3]);
        if ([bx, by, bw, bh].every((n) => Number.isFinite(n))) {
          const thickness = typeof cfg?.floorThickness === 'number' ? cfg.floorThickness : 60;
          const floor = Bodies.rectangle(bx + bw / 2, by + bh - thickness / 2, bw, thickness, {
            isStatic: true,
            friction: 0.8,
          });
          (floor as any).plugin = { ...(floor as any).plugin, entityId: -1 };
          MatterWorld.add(state.engine.world, floor);
          this.floorCreated = true;
        }
      }
    }
  }

  /**
   * Helper for other systems: create and add a body.
   * Not used directly by this system, but handy for programmatic spawns.
   */
  static addBody(world: World, body: Body): void {
    const phys = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!phys) throw new Error('PhysicsSystem not initialized yet (missing RES_PHYSICS)');
    MatterWorld.add(phys.engine.world, body);
  }

  static removeBody(world: World, body: Body): void {
    const phys = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!phys) return;
    MatterWorld.remove(phys.engine.world, body);
  }

  // Convenience factories (optional)
  static box(x: number, y: number, w: number, h: number, opts?: Matter.IChamferableBodyDefinition): Body {
    return Bodies.rectangle(x, y, w, h, opts);
  }

  static circle(x: number, y: number, r: number, opts?: Matter.IBodyDefinition): Body {
    return Bodies.circle(x, y, r, opts);
  }
}

