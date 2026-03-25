import * as PIXI from "pixi.js";
import { SpriteRenderComponent } from "../Components/SpriteRenderComponent";
import { System } from "../Core/System";
import type { World } from "../Core/World";

export class SpriteRenderSystem extends System {
  get singletonKey(): string {
    return "SpriteRenderSystem";
  }

  update(_dt: number, world: World): void {
    for (const [entity, render] of world.query(SpriteRenderComponent)) {
      const view = entity.view;
      if (!(view instanceof PIXI.Sprite)) continue;

      if (render.texture) view.texture = PIXI.Texture.from(render.texture);
      view.tint = render.tint;
      view.alpha = render.alpha;
      view.visible = render.visible;

      const sx = Math.abs(view.scale.x || 1) * (render.flipXState ? -1 : 1);
      const sy = Math.abs(view.scale.y || 1) * (render.flipYState ? -1 : 1);
      view.scale.set(sx, sy);
    }
  }
}

