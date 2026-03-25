import { System } from "../Core/System";
import type { World } from "../Core/World";
import { VisibilityComponent } from "../Components/VisibilityComponent";

/**
 * VisibilitySystem
 * - Applies VisibilityComponent -> Pixi displayObject.visible
 */
export class VisibilitySystem extends System {
  get singletonKey(): string {
    return "VisibilitySystem";
  }

  update(_dt: number, world: World): void {
    for (const [entity, vis] of world.query(VisibilityComponent)) {
      entity.view.visible = vis.isVisible();
    }
  }
}

