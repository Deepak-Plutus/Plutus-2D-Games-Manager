import { System } from '../Core/System';
import type { World } from '../Core/World';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { TransformComponent } from '../Components/TransformComponent';
import { RES_GAME_DEF } from './LoadingSystem';
import { RES_PIXI_APP } from './PixiAppSystem';
import { RES_GROUPS, type GroupsState } from './GroupSystem';
import { RES_SYSTEM_PARAMS, type SystemParamsState } from '../games/base/BaseGameRuntime';

type CameraConfig = {
  zoom?: number;
  follow_entity_id?: string;
  followTarget?: { type: 'entity' | 'group'; id: string; axis?: 'x' | 'y' | 'xy' };
  followAxis?: 'x' | 'y' | 'xy';
  followOffset?: { x?: number; y?: number };
  followOffsetX?: number;
  followOffsetY?: number;
  follow_right_only?: boolean;
  lock_y?: boolean;
  y?: number;
};

/**
 * CameraFollowSystem
 * - Applies stage zoom
 * - Follows an entity (default: "hero")
 * - Optional "follow right only" behavior for classic platformers
 * - Clamps camera to world bounds when available
 */
export class CameraFollowSystem extends System {
  private initialized = false;
  private lastCamX = Number.NEGATIVE_INFINITY;

  get singletonKey(): string {
    return 'CameraFollowSystem';
  }

  update(_dt: number, world: World): void {
    const app = world.getResource<any>(RES_PIXI_APP);
    const def = world.getResource<GameDefinition>(RES_GAME_DEF);
    if (!app || !def) return;

    const cfg = (def.world?.camera as CameraConfig | undefined) ?? {};
    const params = world.getResource<SystemParamsState>(RES_SYSTEM_PARAMS)?.CameraFollowSystem ?? {};
    const p = params as Record<string, unknown>;
    const zoom = typeof cfg.zoom === 'number' && cfg.zoom > 0 ? cfg.zoom : 2;
    const followId =
      typeof p.follow_entity_id === "string"
        ? (p.follow_entity_id as string)
        : typeof cfg.follow_entity_id === 'string'
          ? cfg.follow_entity_id
          : 'hero';
    const followTarget =
      p.followTarget && typeof p.followTarget === "object"
        ? (p.followTarget as CameraConfig["followTarget"])
        : cfg.followTarget;
    const followAxis =
      p.followAxis === "x" || p.followAxis === "y" || p.followAxis === "xy"
        ? (p.followAxis as "x" | "y" | "xy")
        : cfg.followAxis ?? followTarget?.axis ?? "xy";
    const followOffsetX =
      typeof p.followOffsetX === "number"
        ? (p.followOffsetX as number)
        : typeof cfg.followOffsetX === "number"
          ? cfg.followOffsetX
          : typeof cfg.followOffset?.x === "number"
            ? cfg.followOffset.x
            : 0;
    const followOffsetY =
      typeof p.followOffsetY === "number"
        ? (p.followOffsetY as number)
        : typeof cfg.followOffsetY === "number"
          ? cfg.followOffsetY
          : typeof cfg.followOffset?.y === "number"
            ? cfg.followOffset.y
            : 0;
    const axisFromParams = p.followAxis === "x" || p.followAxis === "y" || p.followAxis === "xy";
    const followRightOnly = cfg.follow_right_only ?? true;
    const lockY = cfg.lock_y ?? true;

    if (!this.initialized) {
      app.stage.scale.set(zoom, zoom);
      this.initialized = true;
    } else if (app.stage.scale.x !== zoom || app.stage.scale.y !== zoom) {
      app.stage.scale.set(zoom, zoom);
    }

    // Find target by entity or group.
    const target =
      followTarget?.type === "group"
        ? resolveGroupTarget(world, followTarget.id)
        : resolveEntityTarget(world, followTarget?.id ?? followId);
    let targetX = target?.x;
    let targetY = target?.y;
    if (targetX === undefined || targetY === undefined) return;

    const currentPivot = app.stage.pivot;
    let camX = followAxis === "y" ? currentPivot.x : targetX;
    let camY = followAxis === "x" ? currentPivot.y : targetY;
    if (followAxis !== "y") camX += followOffsetX;
    if (followAxis !== "x") camY += followOffsetY;

    // Right-only follow: never move camera back to the left
    if (followRightOnly && followAxis !== "y") {
      if (!Number.isFinite(this.lastCamX)) this.lastCamX = camX;
      this.lastCamX = Math.max(this.lastCamX, camX);
      camX = this.lastCamX;
    }

    // Explicit system followAxis should take precedence over lock_y.
    if (lockY && followAxis !== "x" && !axisFromParams) {
      camY = typeof cfg.y === 'number' ? cfg.y : targetY;
    }

    // Clamp to world bounds if present: [x, y, width, height]
    const bounds = def.world?.bounds;
    if (Array.isArray(bounds) && bounds.length >= 4) {
      const bx = Number(bounds[0]);
      const by = Number(bounds[1]);
      const bw = Number(bounds[2]);
      const bh = Number(bounds[3]);
      if ([bx, by, bw, bh].every((n) => Number.isFinite(n))) {
        const halfW = app.screen.width / (2 * zoom);
        const halfH = app.screen.height / (2 * zoom);
        const minX = bx + halfW;
        const maxX = bx + bw - halfW;
        const minY = by + halfH;
        const maxY = by + bh - halfH;

        if (minX <= maxX) camX = clamp(camX, minX, maxX);
        if (minY <= maxY) camY = clamp(camY, minY, maxY);
      }
    }

    app.stage.pivot.set(camX, camY);
    app.stage.position.set(app.screen.width / 2, app.screen.height / 2);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function resolveEntityTarget(world: World, name: string): { x: number; y: number } | undefined {
  for (const e of world.allEntities()) {
    if (e.name !== name) continue;
    const t = world.getComponent(e, TransformComponent);
    if (!t) continue;
    return { x: t.position.x, y: t.position.y };
  }
  return undefined;
}

function resolveGroupTarget(world: World, groupKey: string): { x: number; y: number } | undefined {
  const groups = world.getResource<GroupsState>(RES_GROUPS);
  const ids = groups?.groups?.[groupKey];
  if (!ids?.length) return undefined;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const id of ids) {
    const e = world.getEntity(id);
    if (!e) continue;
    const t = world.getComponent(e, TransformComponent);
    if (!t) continue;
    sx += t.position.x;
    sy += t.position.y;
    n++;
  }
  if (n <= 0) return undefined;
  return { x: sx / n, y: sy / n };
}

