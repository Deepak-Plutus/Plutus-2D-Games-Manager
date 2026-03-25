import { LayoutComponent } from "../Components/ui/LayoutComponent";
import { TransformComponent } from "../Components/TransformComponent";
import { System } from "../Core/System";
import type { World } from "../Core/World";
import { RES_PIXI_APP } from "./PixiAppSystem";
import type * as PIXI from "pixi.js";

export class LayoutSystem extends System {
  get singletonKey(): string {
    return "LayoutSystem";
  }

  update(_dt: number, world: World): void {
    const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
    if (!app) return;
    const sw = app.screen.width;
    const sh = app.screen.height;

    for (const [entity, layout] of world.query(LayoutComponent)) {
      let tx = world.getComponent(entity, TransformComponent);
      if (!tx) {
        tx = new TransformComponent();
        world.addComponent(entity, tx);
      }

      const { x: ax, y: ay } = anchorToXY(layout.anchor);
      tx.position = { x: sw * ax + layout.margin.x, y: sh * ay + layout.margin.y };
      layout._dirty = false;
    }
  }
}

function anchorToXY(anchor: LayoutComponent["anchor"]): { x: number; y: number } {
  switch (anchor) {
    case "top-left":
      return { x: 0, y: 0 };
    case "top-center":
      return { x: 0.5, y: 0 };
    case "top-right":
      return { x: 1, y: 0 };
    case "center-left":
      return { x: 0, y: 0.5 };
    case "center":
      return { x: 0.5, y: 0.5 };
    case "center-right":
      return { x: 1, y: 0.5 };
    case "bottom-left":
      return { x: 0, y: 1 };
    case "bottom-center":
      return { x: 0.5, y: 1 };
    case "bottom-right":
      return { x: 1, y: 1 };
    default:
      return { x: 0, y: 0 };
  }
}

