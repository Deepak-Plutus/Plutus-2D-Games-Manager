import { System } from '../Core/System';
import type { World } from '../Core/World';
import { RES_PIXI_APP } from './PixiAppSystem';
import { ParallaxLayerComponent } from '../Components/ParallaxLayerComponent';

/**
 * ParallaxSystem
 * - Moves `ParallaxLayer` entities against camera movement by a configurable factor.
 * - Requires CameraEntitySystem or CameraFollowSystem to be active (stage pivot changes).
 */
export class ParallaxSystem extends System {
  get singletonKey(): string {
    return 'ParallaxSystem';
  }

  private prevCamX?: number;
  private prevCamY?: number;

  update(_dt: number, world: World): void {
    const app = world.getResource<any>(RES_PIXI_APP);
    if (!app) return;

    const camX = app.stage.pivot.x;
    const camY = app.stage.pivot.y;

    const dx = this.prevCamX === undefined ? 0 : camX - this.prevCamX;
    const dy = this.prevCamY === undefined ? 0 : camY - this.prevCamY;

    this.prevCamX = camX;
    this.prevCamY = camY;

    for (const [entity, layer] of world.query(ParallaxLayerComponent)) {
      if (layer.enabled === false) continue;

      // Base position is captured once so repeated updates don't drift.
      if (typeof layer._baseX !== 'number' || typeof layer._baseY !== 'number') {
        layer._baseX = entity.view.position.x;
        layer._baseY = entity.view.position.y;
      }

      const next = layer.updateParallax(dx, dy);
      entity.view.position.x = next.x;
      entity.view.position.y = next.y;
    }
  }
}

