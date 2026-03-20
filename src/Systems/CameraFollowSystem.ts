import { System } from '../Core/System';
import type { World } from '../Core/World';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { TransformComponent } from '../Components/TransformComponent';
import { RES_GAME_DEF } from './LoadingSystem';
import { RES_PIXI_APP } from './PixiAppSystem';

type CameraConfig = {
  zoom?: number;
  follow_entity_id?: string;
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
    const zoom = typeof cfg.zoom === 'number' && cfg.zoom > 0 ? cfg.zoom : 2;
    const followId = typeof cfg.follow_entity_id === 'string' ? cfg.follow_entity_id : 'hero';
    const followRightOnly = cfg.follow_right_only ?? true;
    const lockY = cfg.lock_y ?? true;

    if (!this.initialized) {
      app.stage.scale.set(zoom, zoom);
      this.initialized = true;
    } else if (app.stage.scale.x !== zoom || app.stage.scale.y !== zoom) {
      app.stage.scale.set(zoom, zoom);
    }

    // Find target by name
    let targetX: number | undefined;
    let targetY: number | undefined;
    for (const e of world.allEntities()) {
      if (e.name !== followId) continue;
      const t = world.getComponent(e, TransformComponent);
      if (!t) continue;
      targetX = t.position.x;
      targetY = t.position.y;
      break;
    }
    if (targetX === undefined || targetY === undefined) return;

    // Right-only follow: never move camera back to the left
    let camX = targetX;
    if (followRightOnly) {
      if (!Number.isFinite(this.lastCamX)) this.lastCamX = camX;
      this.lastCamX = Math.max(this.lastCamX, camX);
      camX = this.lastCamX;
    }

    let camY = targetY;
    if (lockY) {
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

