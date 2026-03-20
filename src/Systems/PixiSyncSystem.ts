import { System } from '../Core/System';
import type { World } from '../Core/World';
import { TransformComponent } from '../Components/TransformComponent';

export class PixiSyncSystem extends System {
  update(_dt: number, world: World): void {
    for (const [entity, transform] of world.query(TransformComponent)) {
      entity.view.position.set(transform.position.x, transform.position.y);
      entity.view.rotation = transform.rotation;
      entity.view.scale.set(transform.scale.x, transform.scale.y);
    }
  }
}

