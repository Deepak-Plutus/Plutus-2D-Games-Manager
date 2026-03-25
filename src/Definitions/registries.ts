import * as PIXI from 'pixi.js';
import { AnimatedSpriteEntity } from '../Entities/AnimatedSpriteEntity';
import { ButtonEntity } from '../Entities/ButtonEntity';
import { CircleEntity } from '../Entities/CircleEntity';
import { ContainerEntity } from '../Entities/ContainerEntity';
import { ParticleEmitterEntity } from '../Entities/ParticleEmitterEntity';
import { RectEntity } from '../Entities/RectEntity';
import { SpriteEntity } from '../Entities/SpriteEntity';
import { TextEntity } from '../Entities/TextEntity';
import { PolygonEntity } from '../Entities/PolygonEntity';
import type { EntityBase } from '../Entities/EntityBase';
import type { World } from '../Core/World';

import { ParticleEmitterComponent } from '../Components/ParticleEmitterComponent';
import { SpriteAnimationComponent } from '../Components/SpriteAnimationComponent';
import { SpriteRenderComponent } from '../Components/SpriteRenderComponent';
import { TextUiComponent } from '../Components/ui/TextUiComponent';
import { ButtonUiComponent } from '../Components/ui/ButtonUiComponent';
import { ProgressBarUiComponent } from '../Components/ui/ProgressBarUiComponent';
import { SliderUiComponent } from '../Components/ui/SliderUiComponent';
import { CheckboxUiComponent } from '../Components/ui/CheckboxUiComponent';
import { InputFieldUiComponent } from '../Components/ui/InputFieldUiComponent';
import { ClickableComponent } from '../Components/ui/ClickableComponent';
import { DraggableComponent } from '../Components/ui/DraggableComponent';
import { LayoutComponent, type LayoutAnchor } from '../Components/ui/LayoutComponent';
import { AudioSoundComponent } from '../Components/audio/AudioSoundComponent';
import { AudioMusicComponent } from '../Components/audio/AudioMusicComponent';
import { GroupComponent } from '../Components/GroupComponent';
import { TimerComponent, type TimerAction } from '../Components/TimerComponent';
import { VisibilityComponent } from '../Components/VisibilityComponent';
import { ZIndexComponent } from '../Components/ZIndexComponent';
import { StateMachineComponent } from '../Components/StateMachineComponent';
import type { StateMachineTransitionDef } from '../Components/StateMachineComponent';
import { PickupComponent } from '../Components/PickupComponent';
import { KeyboardControllerComponent } from '../Components/KeyboardControllerComponent';
import { PhysicsBodyComponent } from '../Components/PhysicsBodyComponent';
import { PhysicsControllerComponent, type PhysicsControllerMode } from '../Components/PhysicsControllerComponent';
import { GroundedComponent } from '../Components/GroundedComponent';
import { CollisionResponseComponent } from '../Components/CollisionResponseComponent';
import { GravityComponent } from '../Components/GravityComponent';
import { FrictionComponent } from '../Components/FrictionComponent';
import { BounceComponent } from '../Components/BounceComponent';
import { AnimationStateComponent } from '../Components/AnimationStateComponent';
import { PatrolBehaviorComponent } from '../Components/PatrolBehaviorComponent';
import { FollowTargetComponent } from '../Components/FollowTargetComponent';
import { WanderComponent } from '../Components/WanderComponent';
import { LookAtComponent } from '../Components/LookAtComponent';
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
import { PlayerSpawnComponent } from '../Components/PlayerSpawnComponent';
import { EnemySpawnComponent } from '../Components/EnemySpawnComponent';
import { CameraComponent } from '../Components/CameraComponent';
import { ParallaxLayerComponent } from '../Components/ParallaxLayerComponent';
import { CameraFollowComponent } from '../Components/CameraFollowComponent';
import { CameraShakeComponent } from '../Components/CameraShakeComponent';
import { TagComponent } from '../Components/TagComponent';
import { DamageComponent } from '../Components/DamageComponent';
import { LifetimeComponent } from '../Components/LifetimeComponent';
import { Body, Bodies, World as MatterWorld, type IBodyDefinition, type IChamferableBodyDefinition } from 'matter-js';
import { RES_PHYSICS, type PhysicsState } from '../Systems/PhysicsSystem';
import { prefabTextureUrl } from './assetResolvers';

export type EntityFactory = (app: PIXI.Application, props?: Record<string, unknown>) => EntityBase;

export const entityRegistry: Record<string, EntityFactory> = {
  Background: (_app, props) => {
    const width = typeof props?.width === 'number' ? (props.width as number) : undefined;
    const height = typeof props?.height === 'number' ? (props.height as number) : undefined;
    const textureUrl = typeof props?.texture === 'string' ? (props.texture as string) : undefined;
    const texture = textureUrl ? PIXI.Texture.from(textureUrl) : PIXI.Texture.WHITE;
    return new SpriteEntity({
      texture,
      tint: 0xffffff,
      width,
      height,
      anchor: { x: 0.5, y: 0.5 },
    });
  },

  SpriteAnimation: (_app, props) => {
    const framesRaw = (props as any)?.frames;
    const frames = Array.isArray(framesRaw) ? framesRaw.filter((x: unknown) => typeof x === 'string') : [];
    const fps = typeof (props as any)?.fps === 'number' ? ((props as any).fps as number) : 12;
    const loop = typeof (props as any)?.loop === 'boolean' ? ((props as any).loop as boolean) : true;
    const playing = typeof (props as any)?.playing === 'boolean' ? ((props as any).playing as boolean) : true;
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : undefined;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : undefined;

    const textures = frames.length ? frames.map((url: string) => PIXI.Texture.from(url)) : [PIXI.Texture.WHITE];
    return new AnimatedSpriteEntity({
      textures,
      width,
      height,
      anchor: { x: 0.5, y: 0.5 },
      animationSpeed: fps / 60,
      loop,
      playing,
    });
  },

  ParticleEmitter: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 0;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 0;
    return new ParticleEmitterEntity({ width, height });
  },

  Box: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 48;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 48;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x60a5fa;
    const alpha = typeof (props as any)?.alpha === 'number' ? ((props as any).alpha as number) : 1;
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 0;
    return new RectEntity({ width, height, fill, alpha, radius, anchor: { x: 0.5, y: 0.5 } });
  },

  Text: (_app, props) => {
    const text = typeof (props as any)?.text === 'string' ? ((props as any).text as string) : '';
    const anchor = (props as any)?.anchor;
    const style = (props as any)?.style;
    return new TextEntity({
      text,
      anchor:
        anchor && typeof anchor.x === 'number' && typeof anchor.y === 'number'
          ? { x: anchor.x, y: anchor.y }
          : { x: 0.5, y: 0.5 },
      style: typeof style === 'object' && style ? style : undefined,
    });
  },

  Label: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 160;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 44;
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 12;
    const bgFill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x111827;
    const bgAlpha = typeof (props as any)?.alpha === 'number' ? ((props as any).alpha as number) : 0.85;
    const text = typeof (props as any)?.text === 'string' ? ((props as any).text as string) : 'Label';
    const textColor = typeof (props as any)?.textColor === 'number' ? ((props as any).textColor as number) : 0xffffff;

    const c = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.name = 'bg';
    bg.roundRect(0, 0, width, height, radius);
    bg.fill({ color: bgFill, alpha: bgAlpha });
    bg.pivot.set(width / 2, height / 2);

    const t = new PIXI.Text({
      text,
      style: {
        fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
        fontSize: 14,
        fill: textColor,
      },
    });
    t.name = 'text';
    t.anchor.set(0.5, 0.5);
    t.position.set(0, 0);

    c.addChild(bg);
    c.addChild(t);
    return new ContainerEntity(c);
  },

  ProgressBar: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 220;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 18;
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 9;
    const bgFill = typeof (props as any)?.bgFill === 'number' ? ((props as any).bgFill as number) : 0x111827;
    const fillColor = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x22c55e;
    const showText = typeof (props as any)?.showText === 'boolean' ? ((props as any).showText as boolean) : false;

    const c = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.name = 'bg';
    (bg as any).__w = width;
    (bg as any).__h = height;
    (bg as any).__radius = radius;
    bg.roundRect(0, 0, width, height, radius);
    bg.fill({ color: bgFill, alpha: 0.85 });
    bg.pivot.set(width / 2, height / 2);

    const fill = new PIXI.Graphics();
    fill.name = 'fill';
    (fill as any).__fillColor = fillColor;
    fill.pivot.set(width / 2, height / 2);
    fill.x = -width / 2;
    fill.y = -height / 2;

    c.addChild(bg);
    c.addChild(fill);

    if (showText) {
      const label = new PIXI.Text({
        text: '',
        style: {
          fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
          fontSize: Math.max(10, Math.floor(height * 0.75)),
          fill: 0xffffff,
        },
      });
      label.name = 'label';
      label.anchor.set(0.5, 0.5);
      label.position.set(0, 0);
      c.addChild(label);
    }

    return new ContainerEntity(c);
  },

  Slider: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 240;
    const trackH = typeof (props as any)?.trackHeight === 'number' ? ((props as any).trackHeight as number) : 10;
    const thumbR = typeof (props as any)?.thumbRadius === 'number' ? ((props as any).thumbRadius as number) : 12;
    const trackFill = typeof (props as any)?.trackFill === 'number' ? ((props as any).trackFill as number) : 0x1f2937;
    const thumbFill = typeof (props as any)?.thumbFill === 'number' ? ((props as any).thumbFill as number) : 0x60a5fa;

    const c = new PIXI.Container();
    const track = new PIXI.Graphics();
    track.name = 'track';
    (track as any).__w = width;
    track.roundRect(-width / 2, -trackH / 2, width, trackH, trackH / 2);
    track.fill({ color: trackFill, alpha: 0.9 });

    const thumb = new PIXI.Graphics();
    thumb.name = 'thumb';
    thumb.circle(0, 0, thumbR);
    thumb.fill({ color: thumbFill, alpha: 1 });

    c.addChild(track);
    c.addChild(thumb);
    return new ContainerEntity(c);
  },

  CheckBox: (_app, props) => {
    const size = typeof (props as any)?.size === 'number' ? ((props as any).size as number) : 22;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x111827;
    const stroke = typeof (props as any)?.stroke === 'number' ? ((props as any).stroke as number) : 0x334155;
    const checkFill = typeof (props as any)?.checkFill === 'number' ? ((props as any).checkFill as number) : 0x22c55e;
    const label = typeof (props as any)?.label === 'string' ? ((props as any).label as string) : '';

    const c = new PIXI.Container();
    const box = new PIXI.Graphics();
    box.name = 'box';
    box.roundRect(-size / 2, -size / 2, size, size, 6);
    box.fill({ color: fill, alpha: 0.9 });
    box.stroke({ color: stroke, width: 2, alpha: 0.9 });

    const check = new PIXI.Graphics();
    check.name = 'check';
    check.roundRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8, 4);
    check.fill({ color: checkFill, alpha: 1 });

    c.addChild(box);
    c.addChild(check);

    if (label) {
      const t = new PIXI.Text({
        text: label,
        style: { fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', fontSize: 14, fill: 0xffffff },
      });
      t.name = 'label';
      t.anchor.set(0, 0.5);
      t.position.set(size / 2 + 10, 0);
      c.addChild(t);
    }

    return new ContainerEntity(c);
  },

  InputField: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 220;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 38;
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 10;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x0b1220;
    const stroke = typeof (props as any)?.stroke === 'number' ? ((props as any).stroke as number) : 0x334155;

    const c = new PIXI.Container();
    const bg = new PIXI.Graphics();
    bg.name = 'bg';
    bg.roundRect(0, 0, width, height, radius);
    bg.fill({ color: fill, alpha: 0.9 });
    bg.stroke({ color: stroke, width: 2, alpha: 0.8 });
    bg.pivot.set(width / 2, height / 2);

    const t = new PIXI.Text({
      text: '',
      style: { fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', fontSize: 14, fill: 0xffffff },
    });
    t.name = 'text';
    t.anchor.set(0, 0.5);
    t.position.set(-width / 2 + 12, 0);

    c.addChild(bg);
    c.addChild(t);
    return new ContainerEntity(c);
  },

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

  Polygon: (_app, props) => {
    const verticesRaw = (props as any)?.vertices;
    const vertices: Array<[number, number]> = Array.isArray(verticesRaw)
      ? verticesRaw
          .filter((v: any) => Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number')
          .map((v: any) => [v[0] as number, v[1] as number])
      : [];
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x60a5fa;
    const alpha = typeof (props as any)?.alpha === 'number' ? ((props as any).alpha as number) : 0.9;
    const lineColor = typeof (props as any)?.lineColor === 'number' ? ((props as any).lineColor as number) : 0x0b1220;
    const lineWidth = typeof (props as any)?.lineWidth === 'number' ? ((props as any).lineWidth as number) : 2;
    return new PolygonEntity({ vertices, fill, alpha, lineColor, lineWidth });
  },

  Checkpoint: (_app, props) => {
    const size = typeof (props as any)?.size === 'number' ? ((props as any).size as number) : 38;
    return new RectEntity({
      width: size,
      height: size,
      fill: 0x22c55e,
      alpha: 0.85,
      radius: typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 10,
      anchor: { x: 0.5, y: 0.5 },
    });
  },

  Trap: (_app, props) => {
    const size = typeof (props as any)?.size === 'number' ? ((props as any).size as number) : 38;
    return new RectEntity({
      width: size,
      height: size,
      fill: 0xef4444,
      alpha: 0.75,
      radius: typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 10,
      anchor: { x: 0.5, y: 0.5 },
    });
  },

  CoinPickup: (_app, props) => {
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 16;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0xfbbf24;
    return new CircleEntity({ radius, fill, alpha: 0.95 });
  },

  LevelEnd: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 46;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 60;
    return new RectEntity({
      width,
      height,
      fill: 0x7c3aed,
      alpha: 0.75,
      radius: typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 12,
      anchor: { x: 0.5, y: 0.5 },
    });
  },

  PlayerSpawn: (_app, props) => {
    const size = typeof (props as any)?.size === 'number' ? ((props as any).size as number) : 18;
    return new RectEntity({
      width: size,
      height: size,
      fill: 0x22c55e,
      alpha: 0.8,
      radius: typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 6,
      anchor: { x: 0.5, y: 0.5 },
    });
  },

  EnemySpawn: (_app, props) => {
    const size = typeof (props as any)?.size === 'number' ? ((props as any).size as number) : 18;
    return new RectEntity({
      width: size,
      height: size,
      fill: 0xf97316,
      alpha: 0.8,
      radius: typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 6,
      anchor: { x: 0.5, y: 0.5 },
    });
  },

  Collectible: (_app, props) => {
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 16;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0xfbbf24;
    return new CircleEntity({ radius, fill, alpha: 0.95 });
  },

  Powerup: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 26;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 26;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0xa855f7;
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 8;
    return new RectEntity({ width, height, fill, alpha: 0.75, radius, anchor: { x: 0.5, y: 0.5 } });
  },

  Portal: (_app, props) => {
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 20;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x06b6d4;
    return new CircleEntity({ radius, fill, alpha: 0.65 });
  },

  Platform: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 96;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 24;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x334155;
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 6;
    return new RectEntity({ width, height, fill, alpha: 1, radius, anchor: { x: 0.5, y: 0.5 } });
  },

  MovingPlatform: (_app, props) => {
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : 96;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : 24;
    const fill = typeof (props as any)?.fill === 'number' ? ((props as any).fill as number) : 0x64748b;
    const radius = typeof (props as any)?.radius === 'number' ? ((props as any).radius as number) : 6;
    return new RectEntity({ width, height, fill, alpha: 0.95, radius, anchor: { x: 0.5, y: 0.5 } });
  },

  Camera: (_app, _props) => new ContainerEntity(),

  ParallaxLayer: (_app, props) => {
    const textureUrl = typeof (props as any)?.texture === 'string' ? ((props as any).texture as string) : undefined;
    const texture = textureUrl ? PIXI.Texture.from(textureUrl) : PIXI.Texture.WHITE;
    const width = typeof (props as any)?.width === 'number' ? ((props as any).width as number) : undefined;
    const height = typeof (props as any)?.height === 'number' ? ((props as any).height as number) : undefined;
    const tint = typeof (props as any)?.tint === 'number' ? ((props as any).tint as number) : 0xffffff;
    const anchor = typeof (props as any)?.anchor === 'object' ? (props as any).anchor : undefined;
    return new SpriteEntity({
      texture,
      tint,
      width,
      height,
      anchor: anchor && typeof anchor.x === 'number' && typeof anchor.y === 'number' ? { x: anchor.x, y: anchor.y } : { x: 0.5, y: 0.5 },
    });
  },
  Sound: (_app, _props) => new ContainerEntity(),
  Music: (_app, _props) => new ContainerEntity(),
  Group: (_app, _props) => new ContainerEntity(),
  Timer: (_app, _props) => new ContainerEntity(),
  StateMachine: (_app, _props) => new ContainerEntity(),
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
  spaceship_2d: () =>
    new SpriteEntity({
      texture: (() => {
        const url = prefabTextureUrl('spaceship_2d');
        return url ? PIXI.Texture.from(url) : PIXI.Texture.WHITE;
      })(),
      tint: 0xffffff,
      width: 40,
      height: 60,
      anchor: { x: 0.5, y: 0.5 },
    }),
  ufo_boss_2d: () => new SpriteEntity({ tint: 0xa855f7, width: 120, height: 60, anchor: { x: 0.5, y: 0.5 } }),
  enemy_ship: () =>
    new SpriteEntity({
      texture: (() => {
        const url = prefabTextureUrl('enemy_ship');
        return url ? PIXI.Texture.from(url) : PIXI.Texture.WHITE;
      })(),
      tint: 0xffffff,
      width: 36,
      height: 36,
      anchor: { x: 0.5, y: 0.5 },
    }),
  boss_enemy_ship: () =>
    new SpriteEntity({
      texture: (() => {
        const url = prefabTextureUrl('boss_enemy_ship');
        return url ? PIXI.Texture.from(url) : PIXI.Texture.WHITE;
      })(),
      tint: 0xffffff,
      width: 96,
      height: 54,
      anchor: { x: 0.5, y: 0.5 },
    }),
  topdown_human_2d: () => new SpriteEntity({ tint: 0xf59e0b, width: 36, height: 36, anchor: { x: 0.5, y: 0.5 } }),
  shooter_player: () =>
    new SpriteEntity({
      texture: (() => {
        const url = prefabTextureUrl('shooter_player');
        return url ? PIXI.Texture.from(url) : PIXI.Texture.WHITE;
      })(),
      tint: 0xffffff,
      width: 36,
      height: 36,
      anchor: { x: 0.5, y: 0.5 },
    }),
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

  SpriteAnimation: (world, entity, data) => {
    const framesRaw = (data as any).frames;
    const frames = Array.isArray(framesRaw) ? framesRaw.filter((x: unknown) => typeof x === 'string') : [];
    const fps = typeof (data as any).fps === 'number' ? ((data as any).fps as number) : undefined;
    const loop = typeof (data as any).loop === 'boolean' ? ((data as any).loop as boolean) : undefined;
    const playing = typeof (data as any).playing === 'boolean' ? ((data as any).playing as boolean) : undefined;
    world.addComponent(entity, new SpriteAnimationComponent({ frames, fps, loop, playing }));
  },

  SpriteRender: (world, entity, data) => {
    const texture = typeof (data as any).texture === 'string' ? ((data as any).texture as string) : undefined;
    const tint = typeof (data as any).tint === 'number' ? ((data as any).tint as number) : undefined;
    const alpha = typeof (data as any).alpha === 'number' ? ((data as any).alpha as number) : undefined;
    const visible = typeof (data as any).visible === 'boolean' ? ((data as any).visible as boolean) : undefined;
    const flipX = typeof (data as any).flipX === 'boolean' ? ((data as any).flipX as boolean) : undefined;
    const flipY = typeof (data as any).flipY === 'boolean' ? ((data as any).flipY as boolean) : undefined;
    world.addComponent(entity, new SpriteRenderComponent({ texture, tint, alpha, visible, flipX, flipY }));
  },

  ParticleEmitter: (world, entity, data) => {
    world.addComponent(
      entity,
      new ParticleEmitterComponent({
        ratePerSec: typeof (data as any).ratePerSec === 'number' ? ((data as any).ratePerSec as number) : undefined,
        particleLifeMs: typeof (data as any).particleLifeMs === 'number' ? ((data as any).particleLifeMs as number) : undefined,
        speedMin: typeof (data as any).speedMin === 'number' ? ((data as any).speedMin as number) : undefined,
        speedMax: typeof (data as any).speedMax === 'number' ? ((data as any).speedMax as number) : undefined,
        spreadDeg: typeof (data as any).spreadDeg === 'number' ? ((data as any).spreadDeg as number) : undefined,
        sizeMin: typeof (data as any).sizeMin === 'number' ? ((data as any).sizeMin as number) : undefined,
        sizeMax: typeof (data as any).sizeMax === 'number' ? ((data as any).sizeMax as number) : undefined,
        color: typeof (data as any).color === 'number' ? ((data as any).color as number) : undefined,
        alpha: typeof (data as any).alpha === 'number' ? ((data as any).alpha as number) : undefined,
        maxParticles: typeof (data as any).maxParticles === 'number' ? ((data as any).maxParticles as number) : undefined,
        shape: typeof (data as any).shape === 'string' ? ((data as any).shape as any) : undefined,
        burst: typeof (data as any).burst === 'number' ? ((data as any).burst as number) : undefined,
      }),
    );
  },

  TextUi: (world, entity, data) => {
    const key = typeof (data as any).key === 'string' ? ((data as any).key as string) : undefined;
    const prefix = typeof (data as any).prefix === 'string' ? ((data as any).prefix as string) : undefined;
    const suffix = typeof (data as any).suffix === 'string' ? ((data as any).suffix as string) : undefined;
    const text = typeof (data as any).text === 'string' ? ((data as any).text as string) : undefined;
    const style = typeof (data as any).style === 'object' && (data as any).style ? (data as any).style : undefined;
    world.addComponent(entity, new TextUiComponent({ key, prefix, suffix, text, style }));
  },

  ButtonUi: (world, entity, data) => {
    const key = typeof (data as any).key === "string" ? ((data as any).key as string) : undefined;
    const label = typeof (data as any).label === "string" ? ((data as any).label as string) : undefined;
    const enabled = typeof (data as any).enabled === "boolean" ? ((data as any).enabled as boolean) : undefined;
    world.addComponent(entity, new ButtonUiComponent({ key, label, enabled }));
  },

  ProgressBarUi: (world, entity, data) => {
    const key = typeof (data as any).key === 'string' ? ((data as any).key as string) : 'progress';
    world.addComponent(
      entity,
      new ProgressBarUiComponent({
        key,
        min: typeof (data as any).min === 'number' ? ((data as any).min as number) : undefined,
        max: typeof (data as any).max === 'number' ? ((data as any).max as number) : undefined,
        value: typeof (data as any).value === 'number' ? ((data as any).value as number) : undefined,
        showText: typeof (data as any).showText === 'boolean' ? ((data as any).showText as boolean) : undefined,
        decimals: typeof (data as any).decimals === 'number' ? ((data as any).decimals as number) : undefined,
      }),
    );
  },

  SliderUi: (world, entity, data) => {
    const key = typeof (data as any).key === 'string' ? ((data as any).key as string) : 'slider';
    world.addComponent(
      entity,
      new SliderUiComponent({
        key,
        min: typeof (data as any).min === 'number' ? ((data as any).min as number) : undefined,
        max: typeof (data as any).max === 'number' ? ((data as any).max as number) : undefined,
        value: typeof (data as any).value === 'number' ? ((data as any).value as number) : undefined,
        step: typeof (data as any).step === 'number' ? ((data as any).step as number) : undefined,
      }),
    );
  },

  CheckboxUi: (world, entity, data) => {
    const key = typeof (data as any).key === 'string' ? ((data as any).key as string) : 'checkbox';
    world.addComponent(entity, new CheckboxUiComponent({ key, checked: (data as any).checked as any }));
  },

  InputFieldUi: (world, entity, data) => {
    const key = typeof (data as any).key === 'string' ? ((data as any).key as string) : 'input';
    world.addComponent(
      entity,
      new InputFieldUiComponent({
        key,
        value: typeof (data as any).value === 'string' ? ((data as any).value as string) : undefined,
        placeholder: typeof (data as any).placeholder === 'string' ? ((data as any).placeholder as string) : undefined,
        maxLength: typeof (data as any).maxLength === 'number' ? ((data as any).maxLength as number) : undefined,
      }),
    );
  },

  Clickable: (world, entity, _data) => {
    world.addComponent(entity, new ClickableComponent());
  },

  Draggable: (world, entity, _data) => {
    world.addComponent(entity, new DraggableComponent());
  },

  Layout: (world, entity, data) => {
    const anchor = typeof (data as any).anchor === "string" ? ((data as any).anchor as LayoutAnchor) : undefined;
    const marginX = typeof (data as any).marginX === "number" ? ((data as any).marginX as number) : 0;
    const marginY = typeof (data as any).marginY === "number" ? ((data as any).marginY as number) : 0;
    world.addComponent(entity, new LayoutComponent({ anchor, marginX, marginY }));
  },

  Visibility: (world, entity, data) => {
    const visible = typeof (data as any).visible === 'boolean' ? ((data as any).visible as boolean) : undefined;
    // also allow "shown" or "show" style keys
    const shown = typeof (data as any).shown === 'boolean' ? ((data as any).shown as boolean) : undefined;
    const init = typeof visible === 'boolean' ? { _visible: visible } : shown === undefined ? undefined : { _visible: shown };
    world.addComponent(entity, new VisibilityComponent(init as any));
  },

  Group: (world, entity, data) => {
    const key = typeof (data as any).key === 'string' ? ((data as any).key as string) : undefined;
    const tag = typeof (data as any).tag === 'string' ? ((data as any).tag as string) : undefined;
    const members = Array.isArray((data as any).members)
      ? (data as any).members.filter((x: unknown) => typeof x === 'string')
      : undefined;
    world.addComponent(entity, new GroupComponent({ key, tag, members }));
  },

  Timer: (world, entity, data) => {
    const durationMs = typeof (data as any).durationMs === 'number' ? ((data as any).durationMs as number) : 0;
    const active = typeof (data as any).active === 'boolean' ? ((data as any).active as boolean) : undefined;
    const repeat = typeof (data as any).repeat === 'boolean' ? ((data as any).repeat as boolean) : undefined;
    const startOnCreate = typeof (data as any).startOnCreate === 'boolean' ? ((data as any).startOnCreate as boolean) : undefined;
    const onExpire = Array.isArray((data as any).onExpire) ? ((data as any).onExpire as TimerAction[]) : undefined;

    world.addComponent(
      entity,
      new TimerComponent({
        durationMs,
        active,
        repeat,
        startOnCreate,
        onExpire: onExpire ?? [],
      }),
    );
  },

  StateMachine: (world, entity, data) => {
    const initialState = typeof (data as any).initialState === "string" ? ((data as any).initialState as string) : undefined;
    const statesRaw = (data as any).states;
    const transitionsRaw = (data as any).transitions;

    const states: Record<string, any> =
      statesRaw && typeof statesRaw === "object" && !Array.isArray(statesRaw) ? (statesRaw as Record<string, any>) : {};

    // We keep `states` as a loose object and trust JSON schema.
    const transitions: StateMachineTransitionDef[] = Array.isArray(transitionsRaw)
      ? (transitionsRaw as StateMachineTransitionDef[]).filter((t) => t && typeof (t as any).to === "string" && (t as any).when && typeof (t as any).when.type === "string")
      : [];

    if (!initialState) return;

    world.addComponent(
      entity,
      new StateMachineComponent({
        initialState,
        states: states as any,
        transitions,
      }),
    );
  },

  ZIndex: (world, entity, data) => {
    const zIndex = typeof (data as any).zIndex === "number" ? ((data as any).zIndex as number) : undefined;
    const front = (data as any).front === true;
    const back = (data as any).back === true;
    const v = zIndex ?? (typeof (data as any).value === "number" ? ((data as any).value as number) : undefined);
    world.addComponent(entity, new ZIndexComponent({ zIndex: typeof v === "number" ? v : 0, front, back }));
  },

  Damage: (world, entity, data) => {
    const damage = typeof (data as any).damage === 'number' ? ((data as any).damage as number) : undefined;
    world.addComponent(entity, new DamageComponent({ damage }));
  },

  CameraFollowComponent: (_world, entity, data) => {
    const target = typeof (data as any).target === 'string' ? ((data as any).target as string) : undefined;
    const lerpSpeed = typeof (data as any).lerpSpeed === 'number' ? ((data as any).lerpSpeed as number) : undefined;
    _world.addComponent(entity, new CameraFollowComponent({ target, lerpSpeed }));
  },

  CameraShakeComponent: (_world, entity, data) => {
    const intensity = typeof (data as any).intensity === 'number' ? ((data as any).intensity as number) : undefined;
    const durationMs = typeof (data as any).durationMs === 'number' ? ((data as any).durationMs as number) : undefined;
    _world.addComponent(entity, new CameraShakeComponent({ intensity, durationMs }));
  },

  Pickup: (world, entity, data) => {
    const targetEntityName = typeof (data as any).targetEntityName === 'string' ? ((data as any).targetEntityName as string) : undefined;
    const healAmount = typeof (data as any).healAmount === 'number' ? ((data as any).healAmount as number) : undefined;
    const damageAmount = typeof (data as any).damageAmount === 'number' ? ((data as any).damageAmount as number) : undefined;
    const soundId = typeof (data as any).soundId === 'string' ? ((data as any).soundId as string) : undefined;
    const despawnOnPickup =
      typeof (data as any).despawnOnPickup === 'boolean' ? ((data as any).despawnOnPickup as boolean) : undefined;

    world.addComponent(
      entity,
      new PickupComponent({
        targetEntityName,
        healAmount,
        damageAmount,
        soundId,
        despawnOnPickup,
      }),
    );
  },

  Tag: (world, entity, data) => {
    const tags = Array.isArray((data as any).tags)
      ? (data as any).tags.filter((x: unknown) => typeof x === 'string')
      : undefined;
    world.addComponent(entity, new TagComponent({ tags }));
  },

  AudioSound: (world, entity, data) => {
    const soundId = typeof (data as any).soundId === 'string' ? ((data as any).soundId as string) : undefined;
    const kind = typeof (data as any).kind === 'string' ? ((data as any).kind as any) : undefined;
    const soundType =
      typeof (data as any).soundType === 'string'
        ? ((data as any).soundType as any)
        : typeof (data as any).sound_type === 'string'
          ? ((data as any).sound_type as any)
          : undefined;
    const autoplay = typeof (data as any).autoplay === 'boolean' ? ((data as any).autoplay as boolean) : undefined;

    if (soundType === 'tone') {
      const freq = typeof (data as any).freq === 'number' ? ((data as any).freq as number) : undefined;
      if (!soundId || typeof freq !== 'number') return;
      const durationMs = typeof (data as any).durationMs === 'number' ? ((data as any).durationMs as number) : undefined;
      const volume = typeof (data as any).volume === 'number' ? ((data as any).volume as number) : undefined;
      world.addComponent(entity, new AudioSoundComponent({ soundId, kind, type: 'tone', freq, durationMs, volume, autoplay }));
      return;
    }

    if (soundType === 'url') {
      const url = typeof (data as any).url === 'string' ? ((data as any).url as string) : undefined;
      if (!soundId || typeof url !== 'string') return;
      const loop = typeof (data as any).loop === 'boolean' ? ((data as any).loop as boolean) : undefined;
      const volume = typeof (data as any).volume === 'number' ? ((data as any).volume as number) : undefined;
      world.addComponent(entity, new AudioSoundComponent({ soundId, kind, type: 'url', url, loop, volume, autoplay }));
      return;
    }
  },

  AudioMusic: (world, entity, data) => {
    const soundId = typeof (data as any).soundId === 'string' ? ((data as any).soundId as string) : undefined;
    const kind = typeof (data as any).kind === 'string' ? ((data as any).kind as any) : undefined;
    const soundType =
      typeof (data as any).soundType === 'string'
        ? ((data as any).soundType as any)
        : typeof (data as any).sound_type === 'string'
          ? ((data as any).sound_type as any)
          : undefined;
    const autoplay = typeof (data as any).autoplay === 'boolean' ? ((data as any).autoplay as boolean) : undefined;

    if (soundType === 'tone') {
      const freq = typeof (data as any).freq === 'number' ? ((data as any).freq as number) : undefined;
      if (!soundId || typeof freq !== 'number') return;
      const durationMs = typeof (data as any).durationMs === 'number' ? ((data as any).durationMs as number) : undefined;
      const volume = typeof (data as any).volume === 'number' ? ((data as any).volume as number) : undefined;
      world.addComponent(entity, new AudioMusicComponent({ soundId, kind, type: 'tone', freq, durationMs, volume, autoplay }));
      return;
    }

    if (soundType === 'url') {
      const url = typeof (data as any).url === 'string' ? ((data as any).url as string) : undefined;
      if (!soundId || typeof url !== 'string') return;
      const loop = typeof (data as any).loop === 'boolean' ? ((data as any).loop as boolean) : undefined;
      const volume = typeof (data as any).volume === 'number' ? ((data as any).volume as number) : undefined;
      world.addComponent(entity, new AudioMusicComponent({ soundId, kind, type: 'url', url, loop, volume, autoplay }));
      return;
    }
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
    } else if (shape === 'polygon') {
      const verticesRaw = (data as any).vertices;
      const vertices: Array<[number, number]> = Array.isArray(verticesRaw)
        ? verticesRaw
            .filter((v: any) => Array.isArray(v) && v.length >= 2 && typeof v[0] === 'number' && typeof v[1] === 'number')
            .map((v: any) => [v[0] as number, v[1] as number])
        : [];

      if (vertices.length < 3) {
        const width = typeof data.width === 'number' ? data.width : 48;
        const height = typeof data.height === 'number' ? data.height : 48;
        const optsRect = optsBase as IChamferableBodyDefinition;
        body = Bodies.rectangle(x, y, width, height, optsRect);
      } else {
        // vertices are expected in local space around the entity origin (0,0).
        const optsPoly = optsBase as any;
        const vectors = vertices.map(([vx, vy]) => ({ x: vx, y: vy }));
        const bodies = Bodies.fromVertices(x, y, [vectors as any], optsPoly);
        const first = Array.isArray(bodies) ? bodies[0] : bodies;
        body = first as Body;
        if (Array.isArray(bodies) && bodies.length > 1) {
          console.warn(`[PhysicsBody] Polygon produced ${bodies.length} bodies; using the first part only.`);
        }
      }
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

  CollisionResponse: (world, entity) => {
    world.addComponent(entity, new CollisionResponseComponent());
  },

  Gravity: (world, entity, data) => {
    const x = typeof (data as any).x === 'number' ? ((data as any).x as number) : undefined;
    const y = typeof (data as any).y === 'number' ? ((data as any).y as number) : undefined;
    const enabled = typeof (data as any).enabled === 'boolean' ? ((data as any).enabled as boolean) : undefined;
    world.addComponent(entity, new GravityComponent({ x, y, enabled }));
  },

  Friction: (world, entity, data) => {
    const value = typeof (data as any).value === 'number' ? ((data as any).value as number) : undefined;
    world.addComponent(entity, new FrictionComponent({ value }));
  },

  Bounce: (world, entity, data) => {
    const restitution = typeof (data as any).restitution === 'number' ? ((data as any).restitution as number) : undefined;
    world.addComponent(entity, new BounceComponent({ restitution }));
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
    const comp = new MovingPlatformComponent({ axis, range, speed });
    const pathRaw = (data as any).path;
    const path = Array.isArray(pathRaw)
      ? pathRaw.filter((p: any) => p && typeof p.x === "number" && typeof p.y === "number").map((p: any) => ({ x: p.x as number, y: p.y as number }))
      : undefined;
    if (path?.length) comp.setPath(path);
    world.addComponent(entity, comp);

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

  PlayerSpawn: (world, entity, data) => {
    const prefab = typeof (data as any).prefab === 'string' ? ((data as any).prefab as string) : undefined;
    const slot = typeof (data as any).slot === 'number' ? ((data as any).slot as number) : undefined;
    const spawnPoint =
      typeof (data as any).x === 'number' && typeof (data as any).y === 'number'
        ? { x: (data as any).x as number, y: (data as any).y as number }
        : undefined;
    world.addComponent(entity, new PlayerSpawnComponent({ prefab, slot, spawnPoint }));
  },

  EnemySpawn: (world, entity, data) => {
    const prefab = typeof (data as any).prefab === 'string' ? ((data as any).prefab as string) : undefined;
    const slot = typeof (data as any).slot === 'number' ? ((data as any).slot as number) : undefined;
    const intervalSec =
      typeof (data as any).intervalSec === 'number'
        ? ((data as any).intervalSec as number)
        : typeof (data as any).interval === 'number'
          ? ((data as any).interval as number)
          : undefined;
    world.addComponent(entity, new EnemySpawnComponent({ prefab, slot, intervalSec }));
  },

  /**
   * CollectibleTrigger
   * - Creates a static sensor body + TriggerZone action for "coin pickup" (CollectCoin).
   * - Also attaches CoinCollectibleComponent so CollectCoin can read the value.
   */
  CollectibleTrigger: (world, entity, data) => {
    const value = typeof (data as any).value === 'number' ? ((data as any).value as number) : 1;
    const once = typeof (data as any).once === 'boolean' ? ((data as any).once as boolean) : true;
    const despawnSelf = typeof (data as any).despawnSelf === 'boolean' ? ((data as any).despawnSelf as boolean) : true;
    const tag = typeof (data as any).tag === 'string' ? ((data as any).tag as string) : undefined;
    const radius = typeof (data as any).radius === 'number' ? ((data as any).radius as number) : 16;

    // Ensure the coin value exists on the trigger entity
    if (!world.getComponent(entity, CoinCollectibleComponent)) world.addComponent(entity, new CoinCollectibleComponent({ value }));

    const physicsState = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!physicsState) return;
    if (!world.getComponent(entity, PhysicsBodyComponent)) {
      const t = world.getComponent(entity, TransformComponent);
      const x = t?.position.x ?? 0;
      const y = t?.position.y ?? 0;
      const body = Bodies.circle(x, y, radius, { isStatic: true, isSensor: true, restitution: 0 });
      (body as any).plugin = { ...(body as any).plugin, entityId: entity.id };
      MatterWorld.add(physicsState.engine.world, body);
      world.addComponent(entity, new PhysicsBodyComponent(body));
    }

    const onEnter = [{ type: 'CollectCoin' as const, value, despawnSelf }];
    world.addComponent(entity, new TriggerZoneComponent({ once, tag, onEnter, onExit: [] }));
  },

  /**
   * PowerupTrigger
   * - Static sensor + HealOther trigger action
   */
  PowerupTrigger: (world, entity, data) => {
    const healAmount = typeof (data as any).healAmount === 'number' ? ((data as any).healAmount as number) : 10;
    const once = typeof (data as any).once === 'boolean' ? ((data as any).once as boolean) : true;
    const despawnSelf = typeof (data as any).despawnSelf === 'boolean' ? ((data as any).despawnSelf as boolean) : true;
    const tag = typeof (data as any).tag === 'string' ? ((data as any).tag as string) : undefined;

    const wFromView = Number.isFinite(entity.view.width) && entity.view.width > 0 ? entity.view.width : undefined;
    const hFromView = Number.isFinite(entity.view.height) && entity.view.height > 0 ? entity.view.height : undefined;
    const width = typeof (data as any).width === 'number' ? ((data as any).width as number) : wFromView ?? 26;
    const height = typeof (data as any).height === 'number' ? ((data as any).height as number) : hFromView ?? 26;

    const physicsState = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!physicsState) return;
    if (!world.getComponent(entity, PhysicsBodyComponent)) {
      const t = world.getComponent(entity, TransformComponent);
      const x = t?.position.x ?? 0;
      const y = t?.position.y ?? 0;
      const body = Bodies.rectangle(x, y, width, height, { isStatic: true, isSensor: true, restitution: 0 });
      (body as any).plugin = { ...(body as any).plugin, entityId: entity.id };
      MatterWorld.add(physicsState.engine.world, body);
      world.addComponent(entity, new PhysicsBodyComponent(body));
    }

    const onEnter = [{ type: 'HealOther' as const, amount: healAmount }, ...(despawnSelf ? ([{ type: 'DespawnSelf' as const }] as const) : [])];
    world.addComponent(entity, new TriggerZoneComponent({ once, tag, onEnter, onExit: [] }));
  },

  /**
   * PortalTrigger
   * - Static sensor + TeleportOther action
   */
  PortalTrigger: (world, entity, data) => {
    const tx = typeof (data as any).x === 'number' ? ((data as any).x as number) : 0;
    const ty = typeof (data as any).y === 'number' ? ((data as any).y as number) : 0;
    const once = typeof (data as any).once === 'boolean' ? ((data as any).once as boolean) : true;
    const despawnSelf = typeof (data as any).despawnSelf === 'boolean' ? ((data as any).despawnSelf as boolean) : false;
    const tag = typeof (data as any).tag === 'string' ? ((data as any).tag as string) : undefined;

    const wFromView = Number.isFinite(entity.view.width) && entity.view.width > 0 ? entity.view.width : undefined;
    const hFromView = Number.isFinite(entity.view.height) && entity.view.height > 0 ? entity.view.height : undefined;
    const width = typeof (data as any).width === 'number' ? ((data as any).width as number) : wFromView ?? 46;
    const height = typeof (data as any).height === 'number' ? ((data as any).height as number) : hFromView ?? 60;

    const physicsState = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!physicsState) return;
    if (!world.getComponent(entity, PhysicsBodyComponent)) {
      const t = world.getComponent(entity, TransformComponent);
      const x = t?.position.x ?? 0;
      const y = t?.position.y ?? 0;
      const body = Bodies.rectangle(x, y, width, height, { isStatic: true, isSensor: true, restitution: 0 });
      (body as any).plugin = { ...(body as any).plugin, entityId: entity.id };
      MatterWorld.add(physicsState.engine.world, body);
      world.addComponent(entity, new PhysicsBodyComponent(body));
    }

    const onEnter = [
      { type: 'TeleportOther' as const, x: tx, y: ty },
      ...(despawnSelf ? ([{ type: 'DespawnSelf' as const }] as const) : []),
    ];
    world.addComponent(entity, new TriggerZoneComponent({ once, tag, onEnter, onExit: [] }));
  },

  /**
   * PlatformBody
   * - Static sensor platform-less rectangle used for basic platform geometry.
   * - Attach this to an entityType `Platform` (or any Rect view) for collision/ground.
   */
  PlatformBody: (world, entity, data) => {
    const friction = typeof (data as any).friction === 'number' ? ((data as any).friction as number) : 0.3;
    const radius = typeof (data as any).radius === 'number' ? ((data as any).radius as number) : undefined;
    const physicsState = world.getResource<PhysicsState>(RES_PHYSICS);
    if (!physicsState) return;
    if (world.getComponent(entity, PhysicsBodyComponent)) return;

    const t = world.getComponent(entity, TransformComponent);
    const x = t?.position.x ?? 0;
    const y = t?.position.y ?? 0;

    const wFromView = Number.isFinite(entity.view.width) && entity.view.width > 0 ? entity.view.width : undefined;
    const hFromView = Number.isFinite(entity.view.height) && entity.view.height > 0 ? entity.view.height : undefined;
    const width = typeof (data as any).width === 'number' ? ((data as any).width as number) : wFromView ?? 96;
    const height = typeof (data as any).height === 'number' ? ((data as any).height as number) : hFromView ?? 24;

    const body = Bodies.rectangle(x, y, width, height, { isStatic: true, friction, restitution: 0 });
    (body as any).plugin = { ...(body as any).plugin, entityId: entity.id };
    MatterWorld.add(physicsState.engine.world, body);
    world.addComponent(entity, new PhysicsBodyComponent(body));
    void radius;
  },

  Camera: (_world, entity, data) => {
    const shakeIntensity = typeof (data as any).shakeIntensity === 'number' ? ((data as any).shakeIntensity as number) : undefined;
    const shakeDurationMs = typeof (data as any).shakeDurationMs === 'number' ? ((data as any).shakeDurationMs as number) : undefined;
    const shakeObj = (() => {
      const shake = (data as any).shake;
      if (shake && typeof shake.intensity === 'number' && typeof shake.durationMs === 'number') {
        return { intensity: shake.intensity, durationMs: shake.durationMs };
      }
      if (typeof shakeIntensity === 'number' && typeof shakeDurationMs === 'number') {
        return { intensity: shakeIntensity, durationMs: shakeDurationMs };
      }
      return undefined;
    })();

    const followTargetRaw = (data as any).followTarget;
    const followTarget =
      followTargetRaw &&
      typeof followTargetRaw === "object" &&
      (followTargetRaw.type === "entity" || followTargetRaw.type === "group") &&
      typeof followTargetRaw.id === "string"
        ? {
            type: followTargetRaw.type as "entity" | "group",
            id: followTargetRaw.id as string,
            axis:
              followTargetRaw.axis === "x" || followTargetRaw.axis === "y" || followTargetRaw.axis === "xy"
                ? (followTargetRaw.axis as "x" | "y" | "xy")
                : undefined,
          }
        : undefined;
    const followAxis =
      (data as any).followAxis === "x" || (data as any).followAxis === "y" || (data as any).followAxis === "xy"
        ? ((data as any).followAxis as "x" | "y" | "xy")
        : undefined;
    const followOffsetRaw = (data as any).followOffset;
    const followOffsetX =
      typeof (data as any).followOffsetX === "number"
        ? ((data as any).followOffsetX as number)
        : followOffsetRaw && typeof followOffsetRaw.x === "number"
          ? (followOffsetRaw.x as number)
          : undefined;
    const followOffsetY =
      typeof (data as any).followOffsetY === "number"
        ? ((data as any).followOffsetY as number)
        : followOffsetRaw && typeof followOffsetRaw.y === "number"
          ? (followOffsetRaw.y as number)
          : undefined;

    const cam = new CameraComponent({
      mode: typeof (data as any).mode === 'string' ? ((data as any).mode as any) : undefined,
      zoom: typeof (data as any).zoom === 'number' ? ((data as any).zoom as number) : undefined,
      follow_entity_id: typeof (data as any).follow_entity_id === 'string' ? ((data as any).follow_entity_id as string) : undefined,
      followTarget,
      followAxis,
      followOffsetX,
      followOffsetY,
      follow_right_only: typeof (data as any).follow_right_only === 'boolean' ? ((data as any).follow_right_only as boolean) : undefined,
      lock_y: typeof (data as any).lock_y === 'boolean' ? ((data as any).lock_y as boolean) : undefined,
      y: typeof (data as any).y === 'number' ? ((data as any).y as number) : undefined,
      fixed_x: typeof (data as any).fixed_x === 'number' ? ((data as any).fixed_x as number) : undefined,
      fixed_y: typeof (data as any).fixed_y === 'number' ? ((data as any).fixed_y as number) : undefined,
      bounds: Array.isArray((data as any).bounds)
        ? ((data as any).bounds as any)
        : undefined,
      shake: shakeObj,
    });
    entity.view.name = "camera_view";
    _world.addComponent(entity, cam);
  },

  ParallaxLayer: (_world, entity, data) => {
    const factor = typeof (data as any).factor === 'number' ? ((data as any).factor as number) : 1;
    const enabled = typeof (data as any).enabled === 'boolean' ? ((data as any).enabled as boolean) : true;
    _world.addComponent(entity, new ParallaxLayerComponent({ factor, enabled }));
  },

  HudStats: (world, entity, data) => {
    const targetId = typeof (data as any).targetId === 'string' ? ((data as any).targetId as string) : 'hero';
    const showHealth = typeof (data as any).showHealth === 'boolean' ? ((data as any).showHealth as boolean) : true;
    const showCoins = typeof (data as any).showCoins === 'boolean' ? ((data as any).showCoins as boolean) : true;
    const showEnemyCount =
      typeof (data as any).showEnemyCount === 'boolean' ? ((data as any).showEnemyCount as boolean) : false;
    const showScore = typeof (data as any).showScore === 'boolean' ? ((data as any).showScore as boolean) : false;
    const enemyPrefix = typeof (data as any).enemyPrefix === 'string' ? ((data as any).enemyPrefix as string) : 'enemy_';
    world.addComponent(entity, new HudStatsComponent({ targetId, showHealth, showCoins, showEnemyCount, showScore, enemyPrefix }));
  },

  AnimationState: (world, entity, data) => {
    const idle = typeof (data as any).idle === 'string' ? ((data as any).idle as string) : undefined;
    const run = typeof (data as any).run === 'string' ? ((data as any).run as string) : undefined;
    world.addComponent(entity, new AnimationStateComponent({ idle, run }));
  },

  PatrolBehavior: (world, entity, data) => {
    const range = typeof (data as any).range === 'number' ? ((data as any).range as number) : 200;
    const speed = typeof (data as any).speed === 'number' ? ((data as any).speed as number) : 2;
    const pathRaw = (data as any).path;
    const path = Array.isArray(pathRaw)
      ? pathRaw
          .filter((p: any) => p && typeof p.x === "number" && typeof p.y === "number")
          .map((p: any) => ({ x: p.x as number, y: p.y as number }))
      : undefined;
    world.addComponent(entity, new PatrolBehaviorComponent({ range, speed, path }));

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

  FollowTarget: (world, entity, data) => {
    const targetEntityName =
      typeof (data as any).targetEntityName === "string"
        ? ((data as any).targetEntityName as string)
        : typeof (data as any).target === "string"
          ? ((data as any).target as string)
          : undefined;
    const minDistance =
      typeof (data as any).minDistance === "number"
        ? ((data as any).minDistance as number)
        : typeof (data as any).distance === "number"
          ? ((data as any).distance as number)
          : undefined;
    const speed = typeof (data as any).speed === "number" ? ((data as any).speed as number) : undefined;
    world.addComponent(entity, new FollowTargetComponent({ targetEntityName, minDistance, speed }));
  },

  Wander: (world, entity, data) => {
    const radius = typeof (data as any).radius === "number" ? ((data as any).radius as number) : undefined;
    const speed = typeof (data as any).speed === "number" ? ((data as any).speed as number) : undefined;
    const changeIntervalMs =
      typeof (data as any).changeIntervalMs === "number"
        ? ((data as any).changeIntervalMs as number)
        : typeof (data as any).intervalMs === "number"
          ? ((data as any).intervalMs as number)
          : undefined;
    world.addComponent(entity, new WanderComponent({ radius, speed, changeIntervalMs }));
  },

  LookAt: (world, entity, data) => {
    const targetEntityName =
      typeof (data as any).targetEntityName === "string"
        ? ((data as any).targetEntityName as string)
        : typeof (data as any).target === "string"
          ? ((data as any).target as string)
          : undefined;
    const rotationSpeed =
      typeof (data as any).rotationSpeed === "number"
        ? ((data as any).rotationSpeed as number)
        : typeof (data as any).speed === "number"
          ? ((data as any).speed as number)
          : undefined;
    const targetPosition =
      data && typeof (data as any).targetPosition === "object" && typeof (data as any).targetPosition?.x === "number" && typeof (data as any).targetPosition?.y === "number"
        ? { x: (data as any).targetPosition.x as number, y: (data as any).targetPosition.y as number }
        : undefined;

    world.addComponent(entity, new LookAtComponent({ targetEntityName, rotationSpeed, targetPosition }));
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

  Lifetime: (world, entity, data) => {
    const lifetimeSeconds =
      typeof (data as any).lifetimeSeconds === "number"
        ? ((data as any).lifetimeSeconds as number)
        : typeof (data as any).lifetime === "number"
          ? ((data as any).lifetime as number)
          : undefined;
    const active = typeof (data as any).active === "boolean" ? ((data as any).active as boolean) : undefined;
    const autoDestroy = typeof (data as any).autoDestroy === "boolean" ? ((data as any).autoDestroy as boolean) : undefined;

    world.addComponent(entity, new LifetimeComponent({ lifetimeSeconds, active, autoDestroy }));
  },
};

