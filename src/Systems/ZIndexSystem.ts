import { System } from "../Core/System";
import type { World } from "../Core/World";
import { RES_PIXI_APP } from "./PixiAppSystem";
import { ZIndexComponent } from "../Components/ZIndexComponent";

/**
 * ZIndexSystem
 * - Applies ZIndexComponent -> Pixi display object zIndex.
 * - Supports bringToFront() and sendToBack() via "mode" resolution.
 */
export class ZIndexSystem extends System {
  get singletonKey(): string {
    return "ZIndexSystem";
  }

  update(_dt: number, world: World): void {
    const app = world.getResource<any>(RES_PIXI_APP);
    if (!app) return;

    // Needed for zIndex to affect ordering within a container.
    app.stage.sortableChildren = true;

    const entities: Array<{ entity: any; z: ZIndexComponent }> = [];
    for (const [entity, z] of world.query(ZIndexComponent)) entities.push({ entity, z });
    if (!entities.length) return;

    let minZ = Number.POSITIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    for (const { z } of entities) {
      const v = z.zIndex;
      if (Number.isFinite(v)) {
        minZ = Math.min(minZ, v);
        maxZ = Math.max(maxZ, v);
      }
    }
    if (!Number.isFinite(minZ)) minZ = 0;
    if (!Number.isFinite(maxZ)) maxZ = 0;

    // Resolve front/back first so numeric zIndex ordering is deterministic.
    let frontCursor = maxZ + 1;
    let backCursor = minZ - 1;
    for (const { entity, z } of entities) {
      if (z.mode === "front") {
        entity.view.zIndex = frontCursor++;
        z._setMode("normal");
      } else if (z.mode === "back") {
        entity.view.zIndex = backCursor--;
        z._setMode("normal");
      } else {
        entity.view.zIndex = z.zIndex;
      }
    }
  }
}

