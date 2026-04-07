import type { Container } from 'pixi.js'
import { BaseSystem } from './BaseSystem.js'
import { getDisplayMountParent, getLocalDisplayTransform } from '../Core/DisplayHierarchy.js'
import { COMPONENT_LAYER, COMPONENT_META } from '../Components/index.js'
import type { Transform } from '../Components/Transform.js'
import type { World } from '../ECS/World.js'

type DisplayComp = { view?: (Container & { userData?: { plutusCircle?: boolean } }) | null }
type LayerComp = { zIndex?: number }
type MetaComp = { visible?: boolean }

export class DisplaySyncSystem extends BaseSystem {
  stage: Container | null

  constructor (stage: Container | null = null) {
    super()
    this.stage = stage
  }

  setStage (stage: Container | null): void {
    this.stage = stage
  }

  update (_dt: number, world: World): void {
    if (!this.enabled || !world) return
    const stage = this.stage
    for (const e of world.query('transform', 'display')) {
      const tr = e.components.get('transform') as Transform | undefined
      const disp = e.components.get('display') as DisplayComp | undefined
      const view = disp?.view
      if (!view || !tr) continue

      if (stage) {
        const desiredParent = getDisplayMountParent(world, e.id, stage)
        if (view.parent !== desiredParent) desiredParent.addChild(view)
      }

      const local = getLocalDisplayTransform(world, e.id, tr)
      view.position.set(local.x, local.y)
      view.rotation = local.rotation
      if (view.userData?.plutusCircle) view.scale.set(1, 1)
      else view.scale.set(local.scaleX, local.scaleY)

      const layer = e.components.get(COMPONENT_LAYER) as LayerComp | undefined
      if (layer && typeof layer.zIndex === 'number') view.zIndex = layer.zIndex
      const meta = e.components.get(COMPONENT_META) as MetaComp | undefined
      if (meta && typeof meta.visible === 'boolean') view.visible = meta.visible
    }
  }
}
