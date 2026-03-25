import type { GameDefinition } from '../Definitions/GameDefinition';
import { RES_GAME_DEF } from './LoadingSystem';
import { RES_PIXI_APP } from './PixiAppSystem';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { TransformComponent } from '../Components/TransformComponent';
import { CameraComponent } from '../Components/CameraComponent';
import { CameraFollowComponent } from '../Components/CameraFollowComponent';
import { CameraShakeComponent } from '../Components/CameraShakeComponent';
import { RES_GROUPS, type GroupsState } from './GroupSystem';
import { RES_SYSTEM_PARAMS, type SystemParamsState } from '../games/base/BaseGameRuntime';

/**
 * CameraEntitySystem
 * - Configures stage pivot/position/zoom from an ECS `Camera` entity.
 * - If you also enable CameraFollowSystem, both will fight. Prefer disabling CameraFollowSystem when using this.
 */
export class CameraEntitySystem extends System {
  get singletonKey(): string {
    return 'CameraEntitySystem';
  }

  private initialized = false;
  private lastCamX = Number.NEGATIVE_INFINITY;

  update(dt: number, world: World): void {
    const app = world.getResource<any>(RES_PIXI_APP);
    const def = world.getResource<GameDefinition>(RES_GAME_DEF);
    if (!app || !def) return;

    const camEntity = this.findCameraEntity(world);
    if (!camEntity) return;

    const cam = world.getComponent(camEntity, CameraComponent);
    if (!cam) return;
    const params = world.getResource<SystemParamsState>(RES_SYSTEM_PARAMS)?.CameraEntitySystem ?? {};
    const followAxisParam =
      (params as any).followAxis === "x" || (params as any).followAxis === "y" || (params as any).followAxis === "xy"
        ? ((params as any).followAxis as "x" | "y" | "xy")
        : undefined;

    const zoom = cam.zoom;
    if (!this.initialized) {
      app.stage.scale.set(zoom, zoom);
      this.initialized = true;
    } else if (app.stage.scale.x !== zoom || app.stage.scale.y !== zoom) {
      app.stage.scale.set(zoom, zoom);
    }

    // Determine follow target:
    // - If a CameraFollowComponent exists, it overrides entity selection.
    // - Otherwise, we use CameraComponent.mode/follow_entity_id.
    const followComp = world.getComponent(camEntity, CameraFollowComponent);

    let targetX: number | undefined;
    let targetY: number | undefined;

    if (cam.mode === 'fixed' && !followComp) {
      targetX = typeof cam.fixed_x === 'number' ? cam.fixed_x : 0;
      targetY = typeof cam.fixed_y === 'number' ? cam.fixed_y : cam.y ?? 0;
    } else {
      if (followComp?.target) {
        const t = this.resolveEntityTarget(world, followComp.target);
        targetX = t?.x;
        targetY = t?.y;
      } else if (cam.followTarget?.type === "group") {
        const t = this.resolveGroupTarget(world, cam.followTarget.id);
        targetX = t?.x;
        targetY = t?.y;
      } else {
        const followName = cam.followTarget?.id ?? cam.follow_entity_id ?? 'hero';
        const t = this.resolveEntityTarget(world, followName);
        targetX = t?.x;
        targetY = t?.y;
      }
    }

    if (targetX === undefined || targetY === undefined) return;

    const currentPivot = app.stage.pivot;
    const axis = followAxisParam ?? cam.followAxis ?? cam.followTarget?.axis ?? 'xy';
    const axisFromParams = typeof followAxisParam === "string";
    let camX = axis === "y" ? currentPivot.x : targetX;
    let camY = axis === "x" ? currentPivot.y : targetY;
    if (axis !== "y") camX += cam.followOffsetX;
    if (axis !== "x") camY += cam.followOffsetY;

    // Right-only follow: never move camera back to the left
    if (cam.follow_right_only && axis !== "y") {
      if (!Number.isFinite(this.lastCamX)) this.lastCamX = camX;
      this.lastCamX = Math.max(this.lastCamX, camX);
      camX = this.lastCamX;
    }

    // Clamp to world bounds if present
    const bounds = cam.bounds ?? def.world?.bounds;
    // If follow axis is explicitly provided via system params, let axis win.
    // This avoids lock_y forcing fixed-Y when user requested xy follow.
    const shouldApplyLockY = cam.lock_y && axis !== "x" && !axisFromParams;
    if (shouldApplyLockY) {
      camY = typeof cam.y === 'number' ? cam.y : targetY;
    }

    // Smooth follow (lerp) if CameraFollowComponent exists.
    // Lerp is applied before clamping so bounds still apply to the final value.
    if (followComp) {
      const lerped = followComp.updateFollow(dt, currentPivot.x, currentPivot.y, camX, camY);
      camX = lerped.x;
      camY = lerped.y;
    }

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

    // Apply shake (CameraShakeComponent preferred; fall back to CameraComponent internal shake).
    const shakeComp = world.getComponent(camEntity, CameraShakeComponent);
    const shake = shakeComp
      ? shakeComp.updateShake(dt)
      : (cam as any)._tickShake
        ? (cam as any)._tickShake(Math.max(0, dt))
        : { offsetX: 0, offsetY: 0, active: false };

    const sx = shake?.offsetX ?? 0;
    const sy = shake?.offsetY ?? 0;

    app.stage.pivot.set(camX + sx, camY + sy);
    app.stage.position.set(app.screen.width / 2, app.screen.height / 2);
  }

  private findCameraEntity(world: World): any | undefined {
    for (const [e] of world.query(CameraComponent)) return e;
    return undefined;
  }

  private resolveEntityTarget(world: World, name: string): { x: number; y: number } | undefined {
    for (const e of world.allEntities()) {
      if (e.name !== name) continue;
      const t = world.getComponent(e, TransformComponent);
      if (!t) continue;
      return { x: t.position.x, y: t.position.y };
    }
    return undefined;
  }

  private resolveGroupTarget(world: World, groupKey: string): { x: number; y: number } | undefined {
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
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

