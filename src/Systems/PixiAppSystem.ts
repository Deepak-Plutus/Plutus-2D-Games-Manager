import { System } from '../Core/System';
import type { World } from '../Core/World';
import type * as PIXI from 'pixi.js';

export const RES_PIXI_APP = 'pixi_app';

/**
 * Simple helper "system" that ensures the Pixi app
 * is available as a world resource.
 */
export class PixiAppSystem extends System {
  private app: PIXI.Application;

  constructor(app: PIXI.Application) {
    super();
    this.app = app;
  }

  update(_dt: number, world: World): void {
    if (!world.getResource<PIXI.Application>(RES_PIXI_APP)) {
      world.setResource(RES_PIXI_APP, this.app);
    }
  }
}

