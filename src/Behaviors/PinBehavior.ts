import { BaseBehavior } from './BaseBehavior.js'
import { COMPONENT_DISPLAY, COMPONENT_TRANSFORM } from '../Components/index.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'
import { pinBehaviorDefaults } from './Config/pinBehaviorConfig.js'

type JsonRecord = Record<string, unknown>

export class PinBehavior extends BaseBehavior {
  static type = 'pin'
  static priority = 92
  static defaultProperties = { ...pinBehaviorDefaults }

  pinned = false
  pinnedObjectName = ''
  pinX = true
  pinY = true
  pinAngle = false
  pinWidth = false
  pinHeight = false
  widthMode = 'absolute'
  heightMode = 'absolute'
  destroyWithPinned = false
  private _relX = 0
  private _relY = 0
  private _relRot = 0
  private _relW = 0
  private _relH = 0
  private _scaleWX = 1
  private _scaleHY = 1

  applyJsonProperties (json: JsonRecord): void {
    if (json.pinned != null) this.pinned = !!json.pinned
    if (json.pinnedObjectName != null) this.pinnedObjectName = String(json.pinnedObjectName)
    if (json.pinX != null) this.pinX = !!json.pinX
    if (json.pinY != null) this.pinY = !!json.pinY
    if (json.pinAngle != null) this.pinAngle = !!json.pinAngle
    if (json.pinWidth != null) this.pinWidth = !!json.pinWidth
    if (json.pinHeight != null) this.pinHeight = !!json.pinHeight
    if (json.widthMode != null) this.widthMode = String(json.widthMode)
    if (json.heightMode != null) this.heightMode = String(json.heightMode)
    if (json.destroyWithPinned != null) this.destroyWithPinned = !!json.destroyWithPinned
  }

  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled() || !this.pinned || !this.pinnedObjectName) return
    const { world, entityId, transform, displayView } = ctx
    if (!world) return
    const tid = world.findEntityIdByMetaName(this.pinnedObjectName)
    if (tid == null) {
      if (this.destroyWithPinned) world.destroyEntity(entityId)
      this.pinned = false
      return
    }
    const ttr = world.getComponent(tid, COMPONENT_TRANSFORM) as { x: number; y: number; rotation: number } | undefined
    if (!ttr) return
    const td = world.getComponent(tid, COMPONENT_DISPLAY) as { view?: { width: number; height: number } } | undefined
    const tv = td?.view
    if (this.pinX) transform.x = ttr.x + this._relX
    if (this.pinY) transform.y = ttr.y + this._relY
    if (this.pinAngle) transform.rotation = ttr.rotation + this._relRot
    if (displayView && tv) {
      const v = displayView as { width: number; height: number }
      if (this.pinWidth) v.width = this.widthMode === 'scale' ? tv.width * this._scaleWX : tv.width + this._relW
      if (this.pinHeight) v.height = this.heightMode === 'scale' ? tv.height * this._scaleHY : tv.height + this._relH
    }
  }
}
