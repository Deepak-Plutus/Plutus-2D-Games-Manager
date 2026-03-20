import * as PIXI from 'pixi.js';
import { ButtonEntity } from '../Entities/ButtonEntity';
import { CircleEntity } from '../Entities/CircleEntity';
import { RectEntity } from '../Entities/RectEntity';
import { SpriteEntity } from '../Entities/SpriteEntity';
import type { EntityBase } from '../Entities/EntityBase';
import type { World } from '../Core/World';

import { KeyboardControllerComponent } from '../Components/KeyboardControllerComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { PhysicsControllerComponent, type PhysicsControllerMode } from '../Components/PhysicsControllerComponent';
import { GroundedComponent } from '../Components/GroundedComponent';
import { AnimationStateComponent } from '../Components/AnimationStateComponent';
import { PatrolBehaviorComponent } from '../Components/PatrolBehaviorComponent';
import { CollisionHarmComponent } from '../Components/CollisionHarmComponent';
import { HealthComponent } from '../Components/HealthComponent';
import { PlatformerBehaviorComponent } from '../Components/PlatformerBehaviorComponent';
import { TriggerZoneComponent } from '../Components/TriggerZoneComponent';
import { MovingPlatformComponent } from '../Components/MovingPlatformComponent';
import { SpringPlatformComponent } from '../Components/SpringPlatformComponent';
import { PlatformSpawnerComponent } from '../Components/PlatformSpawnerComponent';
import { CoinCollectibleComponent } from '../Components/CoinCollectibleComponent';
import { HudStatsComponent } from '../Components/HudStatsComponent';
import { TransformComponent } from '../Components/TransformComponent';
import { VelocityComponent } from '../Components/VelocityComponent';
import { Body, Bodies, World as MatterWorld, type IBodyDefinition, type IChamferableBodyDefinition } from 'matter-js';
import { RES_PHYSICS, type PhysicsState } from '../Systems/PhysicsSystem';
import { prefabTextureUrl } from './assetResolvers';

export type EntityFactory = (app: PIXI.Application, props?: Record<string, unknown>) => EntityBase;

export const entityRegistry: Record<string, EntityFactory> = {
  Sprite: (_app, props) => {
    const tint = typeof props?.tint === 'number' ? props.tint : 0x3b82f6;
    const width = typeof props?.width === 'number' ? props.width : 48;
    const height = typeof props?.height === 'number' ? props.height : 48;
    const textureUrl = typeof props?.texture === 'string' ? props.texture : undefined;
    const texture = textureUrl ? PIXI.Texture.from(textureUrl) : PIXI.Texture.WHITE;
    return new SpriteEntity({
      texture,
      tint,
      width,
      height,
      anchor: { x: 0.5, y: 0.5 },
    });
  },
  Rect: (_app, props) => {
    const width = typeof props?.width === 'number' ? props.width : 48;
    const height = typeof props?.height === 'number' ? props.height : 48;
    const fill = typeof props?.fill === 'number' ? props.fill : 0xffffff;
    const alpha = typeof props?.alpha === 'number' ? props.alpha : 1;
    const radius = typeof props?.radius === 'number' ? props.radius : 0;
    return new RectEntity({ width, height, fill, alpha, radius, anchor: { x: 0.5, y: 0.5 } });
  },
  Circle: (_app, props) => {
    const radius = typeof props?.radius === 'number' ? props.radius : 18;
    const fill = typeof props?.fill === 'number' ? props.fill : 0xffffff;
    return new CircleEntity({ radius, fill, alpha: 1 });
  },
  Button: (_app, props) => {
    const width = typeof props?.width === 'number' ? props.width : 140;
    const height = typeof props?.height === 'number' ? props.height : 44;
    const label = typeof props?.label === 'string' ? props.label : 'Button';
    const fill = typeof props?.fill === 'number' ? props.fill : 0x111827;
    const hoverFill = typeof props?.hoverFill === 'number' ? props.hoverFill : 0x1f2937;
    return new ButtonEntity({ width, height, label, fill, hoverFill });
  },
};

/**
 * Back-compat prefabs from your earlier JSON examples.
 * These map to Sprite-like entities with different tints/sizes.
 */
export const prefabRegistry: Record<string, (app: PIXI.Application) => EntityBase> = {
  sprite_hero_2d: () =>
    new SpriteEntity({
      texture: (() => {
        const url = prefabTextureUrl('sprite_hero_2d');
        return url ? PIXI.Texture.from(url) : PIXI.Texture.WHITE;
      })(),
      tint: 0xffffff,
      width: 48,
      height: 48,
      anchor: { x: 0.5, y: 0.5 },
    }),
  enemy_sprite_2d: () =>
    new SpriteEntity({
      texture: (() => {
        const url = prefabTextureUrl('enemy_sprite_2d');
        return url ? PIXI.Texture.from(url) : PIXI.Texture.WHITE;
      })(),
      tint: 0xffffff,
      width: 44,
      height: 44,
      anchor: { x: 0.5, y: 0.5 },
    }),
  spaceship_2d: () => new SpriteEntity({ tint: 0x22c55e, width: 40, height: 60, anchor: { x: 0.5, y: 0.5 } }),
  ufo_boss_2d: () => new SpriteEntity({ tint: 0xa855f7, width: 120, height: 60, anchor: { x: 0.5, y: 0.5 } }),
  topdown_human_2d: () => new SpriteEntity({ tint: 0xf59e0b, width: 36, height: 36, anchor: { x: 0.5, y: 0.5 } }),
  guard_2d: () => new SpriteEntity({ tint: 0x64748b, width: 36, height: 36, anchor: { x: 0.5, y: 0.5 } }),
};

export type ComponentFactory = (world: World, entity: EntityBase, data: Record<string, unknown>) => void;

export const componentRegistry: Record<string, ComponentFactory> = {
  Transform: (world, entity, data) => {
    const pos = data.pos;
    const position =
      Array.isArray(pos) && typeof pos[0] === 'number' && typeof pos[1] === 'number'
        ? { x: pos[0], y: pos[1] }
        : undefined;
    world.addComponent(entity, new TransformComponent({ position }));
  },

  Velocity: (world, entity, data) => {
    const x = typeof data.x === 'number' ? data.x : 0;
    const y = typeof data.y === 'number' ? data.y : 0;
    world.addComponent(entity, new VelocityComponent({ x, y }));
  },

  KeyboardController: (world, entity, data) => {
    const speed = typeof data.speed === 'number' ? data.speed : 250;
    world.addComponent(entity, new KeyboardControllerComponent({ speed }));
    // keyboard control expects velocity exists
    if (!world.getComponent(entity, VelocityComponent)) {
      world.addComponent(entity, new VelocityComponent());
    }
  },

  // Alias for your earlier JSON
  PlatformerController: (world, entity, data) => {
    // Construct-like platform behavior over Matter:
    // - `speed` in your JSON is treated as max horizontal speed (px/s-ish in our world)
    // - `jump_force` is treated as jump impulse (force)
    const rawSpeed = typeof (data as any).speed === 'number' ? ((data as any).speed as number) : 7;
    // If JSON uses small Construct-like numbers (e.g. 5), scale to something visible in px/s.
    // Use a smaller scaler so low JSON values feel controllable (Mario-like) without editing JSON.
    const maxSpeedX = rawSpeed < 50 ? rawSpeed * 10 : rawSpeed;

    const rawJump = typeof (data as any).jump_force === 'number' ? ((data as any).jump_force as number) : 15;
    const jumpImpulse = rawJump * 0.03;
    const accel = typeof (data as any).accel === 'number' ? ((data as any).accel as number) : undefined;
    const decel = typeof (data as any).decel === 'number' ? ((data as any).decel as number) : undefined;
    const airControl = typeof (data as any).airControl === 'number' ? ((data as any).airControl as number) : undefined;
    const jumpCutMultiplier = typeof (data as any).jumpCutMultiplier === 'number' ? ((data as any).jumpCutMultiplier as number) : undefined;
    const coyoteTimeMs = typeof (data as any).coyoteTimeMs === 'number' ? ((data as any).coyoteTimeMs as number) : undefined;
    const jumpBufferMs = typeof (data as any).jumpBufferMs === 'number' ? ((data as any).jumpBufferMs as number) : undefined;
    const maxFallSpeed = typeof (data as any).maxFallSpeed === 'number' ? ((data as any).maxFallSpeed as number) : undefined;

    // Ensure a physics body exists so the behavior can actually move something.
    // This keeps your JSON minimal (Construct-style: behavior implies physics).
    if (!world.getComponent(entity, PhysicsBodyComponent)) {
      const phys = world.getResource<PhysicsState>(RES_PHYSICS);
      if (!phys) {
        console.warn('[PlatformerController] PhysicsSystem not initialized (missing RES_PHYSICS).');
      } else {
        const t = world.getComponent(entity, TransformComponent);
        const x = t?.position.x ?? 0;
        const y = t?.position.y ?? 0;

        const w = Number.isFinite(entity.view.width) && entity.view.width > 0 ? entity.view.width : 48;
        const h = Number.isFinite(entity.view.height) && entity.view.height > 0 ? entity.view.height : 48;

        const body = Bodies.rectangle(x, y, w, h, {
          friction: 0.01,
          restitution: 0,
          isStatic: false,
        });
        Body.setInertia(body, Infinity); // fixed rotation (typical platformer)
        (body as any).plugin = { ...(body as any).plugin, entityId: entity.id };
        MatterWorld.add(phys.engine.world, body);
        world.addComponent(entity, new PhysicsBodyComponent(body));
      }
    }

    if (!world.getComponent(entity, GroundedComponent)) {
      world.addComponent(entity, new GroundedComponent());
    }

    world.addComponent(
      entity,
      new PlatformerBehaviorComponent({
        maxSpeedX,
        jumpImpulse,
        accel,
        decel,
        airControl,
        jumpCutMultiplier,
        coyoteTimeMs,
        jumpBufferMs,
        maxFallSpeed,
      }),
    );
  },

  /**
   * PhysicsBody (Matter.js)
   * Example:
   * { "type":"PhysicsBody", "shape":"box", "width":48, "height":48, "isStatic":false, "friction":0.1, "restitution":0.0 }
   */
  PhysicsBody: (world, entity, data) => {
    const phys = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!phys) {
      console.warn('[PhysicsBody] PhysicsSystem not initialized (missing RES_PHYSICS). Add PhysicsSystem before LoadingSystem.');
      return;
    }

    const t = world.getComponent(entity, TransformComponent);
    const x = t?.position.x ?? 0;
    const y = t?.position.y ?? 0;

    const shape = typeof data.shape === 'string' ? data.shape : 'box';
    const isStatic = typeof data.isStatic === 'boolean' ? data.isStatic : false;
    const isSensor = typeof data.isSensor === 'boolean' ? data.isSensor : false;
    const friction = typeof data.friction === 'number' ? data.friction : undefined;
    const restitution = typeof data.restitution === 'number' ? data.restitution : undefined;
    const density = typeof data.density === 'number' ? data.density : undefined;
    const frictionAir = typeof data.frictionAir === 'number' ? data.frictionAir : undefined;
    const fixedRotation = typeof data.fixedRotation === 'boolean' ? data.fixedRotation : false;

    const optsBase: IBodyDefinition = {
      isStatic,
      isSensor,
    };
    if (friction !== undefined) optsBase.friction = friction;
    if (restitution !== undefined) optsBase.restitution = restitution;
    if (density !== undefined) optsBase.density = density;
    if (frictionAir !== undefined) optsBase.frictionAir = frictionAir;

    let body: Body;
    if (shape === 'circle') {
      const radius = typeof data.radius === 'number' ? data.radius : 16;
      body = Bodies.circle(x, y, radius, optsBase);
    } else {
      const width = typeof data.width === 'number' ? data.width : 48;
      const height = typeof data.height === 'number' ? data.height : 48;
      const optsRect = optsBase as IChamferableBodyDefinition;
      body = Bodies.rectangle(x, y, width, height, optsRect);
    }

    if (fixedRotation) {
      Body.setInertia(body, Infinity);
    }

    // Link body -> entity for contact systems
    (body as any).plugin = { ...(body as any).plugin, entityId: entity.id };

    MatterWorld.add(phys.engine.world, body);
    world.addComponent(entity, new PhysicsBodyComponent(body));
  },

  /**
   * PhysicsController
   * { "type":"PhysicsController", "mode":"platformer", "moveSpeed": 6, "jumpImpulse": 0.18, "maxSpeedX": 8, "airControl": 0.4 }
   */
  PhysicsController: (world, entity, data) => {
    const mode = (typeof data.mode === 'string' ? data.mode : 'platformer') as PhysicsControllerMode;
    const moveSpeed = typeof data.moveSpeed === 'number' ? data.moveSpeed : 6;
    const jumpImpulse = typeof data.jumpImpulse === 'number' ? data.jumpImpulse : 0.18;
    const maxSpeedX = typeof data.maxSpeedX === 'number' ? data.maxSpeedX : 8;
    const maxSpeedY = typeof data.maxSpeedY === 'number' ? data.maxSpeedY : 20;
    const airControl = typeof data.airControl === 'number' ? data.airControl : 0.4;
    world.addComponent(entity, new PhysicsControllerComponent({ mode, moveSpeed, jumpImpulse, maxSpeedX, maxSpeedY, airControl }));
  },

  Grounded: (world, entity) => {
    world.addComponent(entity, new GroundedComponent());
  },

  /**
   * TriggerZone
   * Example:
   * { "type":"TriggerZone", "once": true, "onEnter":[{"type":"PlaySound","soundId":"blip"}] }
   */
  TriggerZone: (world, entity, data) => {
    const once = typeof data.once === 'boolean' ? data.once : false;
    const tag = typeof data.tag === 'string' ? data.tag : undefined;
    const onEnter = Array.isArray((data as any).onEnter) ? ((data as any).onEnter as any[]) : [];
    const onExit = Array.isArray((data as any).onExit) ? ((data as any).onExit as any[]) : [];
    world.addComponent(entity, new TriggerZoneComponent({ once, tag, onEnter, onExit }));
  },

  MovingPlatform: (world, entity, data) => {
    const axis = (data.axis === 'y' ? 'y' : 'x') as 'x' | 'y';
    const range = typeof data.range === 'number' ? data.range : 160;
    const speed = typeof data.speed === 'number' ? data.speed : 80;
    world.addComponent(entity, new MovingPlatformComponent({ axis, range, speed }));

    // Moving platforms should participate in physics as kinematic-like static bodies.
    const phys = world.getComponent(entity, PhysicsBodyComponent);
    if (!phys) {
      const physicsState = world.getResource<PhysicsState>(RES_PHYSICS);
      if (!physicsState) return;
      const t = world.getComponent(entity, TransformComponent);
      const x = t?.position.x ?? 0;
      const y = t?.position.y ?? 0;
      const w =
        typeof (data as any).width === 'number'
          ? ((data as any).width as number)
          : Number.isFinite(entity.view.width) && entity.view.width > 0
            ? entity.view.width
            : 96;
      const h =
        typeof (data as any).height === 'number'
          ? ((data as any).height as number)
          : Number.isFinite(entity.view.height) && entity.view.height > 0
            ? entity.view.height
            : 24;
      const body = Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 0.3, restitution: 0 });
      (body as any).plugin = { ...(body as any).plugin, entityId: entity.id };
      MatterWorld.add(physicsState.engine.world, body);
      world.addComponent(entity, new PhysicsBodyComponent(body));
    }
  },

  SpringPlatform: (world, entity, data) => {
    const jumpBoost = typeof (data as any).jumpBoost === 'number' ? ((data as any).jumpBoost as number) : 14;
    world.addComponent(entity, new SpringPlatformComponent({ jumpBoost }));
  },

  PlatformSpawner: (world, entity, data) => {
    const cooldownMs = typeof (data as any).cooldownMs === 'number' ? ((data as any).cooldownMs as number) : 4000;
    const maxAlive = typeof (data as any).maxAlive === 'number' ? ((data as any).maxAlive as number) : 3;
    const spawnedPrefix =
      typeof (data as any).spawnedPrefix === 'string' ? ((data as any).spawnedPrefix as string) : `${entity.name}_spawn`;
    const template = (data as any).template;
    world.addComponent(
      entity,
      new PlatformSpawnerComponent({
        cooldownMs,
        maxAlive,
        spawnedPrefix,
        template: template && typeof template === 'object' ? (template as any) : undefined,
      }),
    );
  },

  CoinCollectible: (world, entity, data) => {
    const value = typeof (data as any).value === 'number' ? ((data as any).value as number) : 1;
    world.addComponent(entity, new CoinCollectibleComponent({ value }));
  },

  HudStats: (world, entity, data) => {
    const targetId = typeof (data as any).targetId === 'string' ? ((data as any).targetId as string) : 'hero';
    const showHealth = typeof (data as any).showHealth === 'boolean' ? ((data as any).showHealth as boolean) : true;
    const showCoins = typeof (data as any).showCoins === 'boolean' ? ((data as any).showCoins as boolean) : true;
    world.addComponent(entity, new HudStatsComponent({ targetId, showHealth, showCoins }));
  },

  AnimationState: (world, entity, data) => {
    const idle = typeof (data as any).idle === 'string' ? ((data as any).idle as string) : undefined;
    const run = typeof (data as any).run === 'string' ? ((data as any).run as string) : undefined;
    world.addComponent(entity, new AnimationStateComponent({ idle, run }));
  },

  PatrolBehavior: (world, entity, data) => {
    const range = typeof (data as any).range === 'number' ? ((data as any).range as number) : 200;
    const speed = typeof (data as any).speed === 'number' ? ((data as any).speed as number) : 2;
    world.addComponent(entity, new PatrolBehaviorComponent({ range, speed }));

    // Ensure patrol actors participate in physics so they stay on ground.
    if (!world.getComponent(entity, PhysicsBodyComponent)) {
      const phys = world.getResource<PhysicsState>(RES_PHYSICS);
      if (phys) {
        const t = world.getComponent(entity, TransformComponent);
        const x = t?.position.x ?? 0;
        const y = t?.position.y ?? 0;
        const w = Number.isFinite(entity.view.width) && entity.view.width > 0 ? entity.view.width : 44;
        const h = Number.isFinite(entity.view.height) && entity.view.height > 0 ? entity.view.height : 44;

        const body = Bodies.rectangle(x, y, w, h, {
          friction: 0.01,
          restitution: 0,
          isStatic: false,
        });
        Body.setInertia(body, Infinity);
        (body as any).plugin = { ...(body as any).plugin, entityId: entity.id };
        MatterWorld.add(phys.engine.world, body);
        world.addComponent(entity, new PhysicsBodyComponent(body));
      }
    }
  },

  CollisionHarm: (world, entity, data) => {
    const damage = typeof (data as any).damage === 'number' ? ((data as any).damage as number) : 10;
    const cooldownMs = typeof (data as any).cooldownMs === 'number' ? ((data as any).cooldownMs as number) : 500;
    world.addComponent(entity, new CollisionHarmComponent({ damage, cooldownMs }));
  },

  Health: (world, entity, data) => {
    const hp = typeof (data as any).hp === 'number' ? ((data as any).hp as number) : 100;
    const maxHp = typeof (data as any).maxHp === 'number' ? ((data as any).maxHp as number) : hp;
    world.addComponent(entity, new HealthComponent({ hp, maxHp }));
  },
};

