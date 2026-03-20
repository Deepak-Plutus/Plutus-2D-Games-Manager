import * as PIXI from 'pixi.js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import type { GameDefinition } from '../Definitions/GameDefinition';
import { backgroundTextureUrl } from '../Definitions/assetResolvers';
import { RES_GAME_DEF, RES_LOADING, type LoadingState } from './LoadingSystem';
import { RES_PIXI_APP } from './PixiAppSystem';

export const RES_BACKGROUND = 'background';

export type BackgroundResource = {
  id: string;
  sprite: PIXI.Sprite;
};

/**
 * BackgroundSystem
 * Renders `gameDef.world.background` behind everything else.
 * Expects the asset to be served from /public and (ideally) preloaded by LoadingSystem.
 */
export class BackgroundSystem extends System {
  private created = false;

  update(_dt: number, world: World): void {
    if (this.created) return;

    const def = world.getResource<GameDefinition>(RES_GAME_DEF);
    const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
    if (!def || !app) return;

    // Wait until loading is ready (so textures are preloaded)
    const loading = world.getResource<LoadingState>(RES_LOADING);
    if (loading && loading.phase !== 'ready') return;

    const bgId = def.world?.background;
    if (typeof bgId !== 'string' || bgId.length === 0) return;

    const url = backgroundTextureUrl(bgId);
    if (!url) {
      console.warn(`[background] Unknown background "${bgId}"`);
      return;
    }

    const sprite = new PIXI.Sprite(PIXI.Texture.from(url));
    sprite.anchor.set(0.5, 0.5);
    sprite.zIndex = -1000;

    // Ensure ordering respects zIndex
    app.stage.sortableChildren = true;

    app.stage.addChildAt(sprite, 0);
    this.fitToScreen(app, sprite);

    // Refitting on resize
    const onResize = () => this.fitToScreen(app, sprite);
    window.addEventListener('resize', onResize);

    world.setResource<BackgroundResource>(RES_BACKGROUND, { id: bgId, sprite });
    this.created = true;
  }

  private fitToScreen(app: PIXI.Application, sprite: PIXI.Sprite): void {
    const w = app.screen.width;
    const h = app.screen.height;
    sprite.position.set(w / 2, h / 2);

    const tw = sprite.texture.width || 1;
    const th = sprite.texture.height || 1;

    // Cover the screen
    const scale = Math.max(w / tw, h / th);
    sprite.scale.set(scale, scale);
  }
}

