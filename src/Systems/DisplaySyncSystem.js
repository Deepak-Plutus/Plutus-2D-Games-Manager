import { BaseSystem } from './BaseSystem.js';
import { getDisplayMountParent, getLocalDisplayTransform } from '../Core/DisplayHierarchy.js';
import { COMPONENT_LAYER, COMPONENT_META } from '../Components/index.js';

/**
 * Copies `transform` component data onto Pixi `display.view` each frame.
 */
export class DisplaySyncSystem extends BaseSystem {
  /**
   * @param {import('pixi.js').Container | null} stage
   */
  constructor(stage = null) {
    super();
    /** @type {import('pixi.js').Container | null} */
    this.stage = stage;
  }

  /**
   * @param {import('pixi.js').Container | null} stage
   */
  setStage(stage) {
    this.stage = stage;
  }

  update(_dt, world) {
    if (!this.enabled || !world) return;
    const stage = this.stage;
    for (const e of world.query('transform', 'display')) {
      const tr = e.components.get('transform');
      const disp = e.components.get('display');
      const view = disp?.view;
      if (!view || !tr) continue;

      if (stage) {
        const desiredParent = getDisplayMountParent(world, e.id, stage);
        if (view.parent !== desiredParent) {
          desiredParent.addChild(view);
        }
      }

      const local = getLocalDisplayTransform(world, e.id, tr);
      view.position.set(local.x, local.y);
      view.rotation = local.rotation;
      if (view.userData?.plutusCircle) {
        view.scale.set(1, 1);
      } else {
        view.scale.set(local.scaleX, local.scaleY);
      }
      const layer = e.components.get(COMPONENT_LAYER);
      if (layer && typeof layer.zIndex === 'number') {
        view.zIndex = layer.zIndex;
      }
      const meta = e.components.get(COMPONENT_META);
      if (meta && typeof meta.visible === 'boolean') {
        view.visible = meta.visible;
      }
    }
  }
}
