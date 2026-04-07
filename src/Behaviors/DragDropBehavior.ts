import { BaseBehavior } from './BaseBehavior.js'
import { dragDropBehaviorDefaults } from './Config/dragDropBehaviorConfig.js'
import type { BehaviorRuntimeContext } from './BehaviorRuntimeContext.js'

type JsonRecord = Record<string, unknown>

/**
 * Pointer-driven drag and drop behavior for display entities.
 *
 * Adds pointer listeners to the entity view and updates transform while the
 * pointer is pressed. Emits drag lifecycle events for gameplay/UI reactions.
 *
 * @example
 * { "type": "dragDrop", "axes": "both", "dragZOffset": 1200 }
 */
export class DragDropBehavior extends BaseBehavior {
  static type = 'dragDrop'
  static priority = 25
  static defaultProperties = { ...dragDropBehaviorDefaults }

  axes = 'both'
  dragThreshold = 2
  dragZOffset = 1000
  private _wired = false
  private _drag = false
  private _offX = 0
  private _offY = 0
  private _baseZ = 0

  /**
   * Applies drag options from JSON.
   *
   * @param {JsonRecord} json Raw behavior config.
   * @returns {void} Nothing.
   */
  applyJsonProperties (json: JsonRecord): void {
    if (json.axes != null) this.axes = String(json.axes)
    if (json.dragThreshold != null) this.dragThreshold = Number(json.dragThreshold)
    if (json.dragZOffset != null) this.dragZOffset = Number(json.dragZOffset)
  }

  /**
   * Ends active drag state.
   *
   * @returns {void} Nothing.
   */
  drop (): void {
    this._drag = false
  }

  /**
   * Reports whether the entity is currently being dragged.
   *
   * @returns {boolean} `true` when drag is active.
   */
  isDragging (): boolean {
    return this._drag
  }

  /**
   * Wires pointer handlers and updates transform during drag.
   *
   * @param {BehaviorRuntimeContext} ctx Runtime behavior context.
   * @returns {void} Nothing.
   */
  tick (ctx: BehaviorRuntimeContext): void {
    if (!this.isEnabled() || !ctx.displayView) return
    const view = ctx.displayView
    const pointer = ctx.pointer
    if (!this._wired) {
      this._wired = true
      this._baseZ = (view as { zIndex?: number }).zIndex ?? 0
      ;(view as { eventMode?: string }).eventMode = 'static'
      ;(view as { cursor?: string }).cursor = 'pointer'
      ;(view as { on: (e: string, cb: (ev: { getLocalPosition: (p: unknown) => { x: number; y: number } }) => void) => void }).on(
        'pointerdown',
        e => {
          if (!this.isEnabled()) return
          const parent = (view as { parent?: unknown }).parent
          if (!parent) return
          const lp = e.getLocalPosition(parent)
          this._drag = true
          this._offX = ctx.transform.x - lp.x
          this._offY = ctx.transform.y - lp.y
          ;(view as { zIndex?: number }).zIndex = this._baseZ + this.dragZOffset
          ;(parent as { sortableChildren?: boolean }).sortableChildren = true
          ctx.events?.emit('dragDrop:dragStart', { entityId: ctx.entityId })
        }
      )
    }
    if (this._drag) {
      if (!pointer?.isDown) {
        this._drag = false
        ;(view as { zIndex?: number }).zIndex = this._baseZ
        ctx.events?.emit('dragDrop:drop', { entityId: ctx.entityId })
        return
      }
      if (this.axes !== 'vertical') ctx.transform.x = pointer.x + this._offX
      if (this.axes !== 'horizontal') ctx.transform.y = pointer.y + this._offY
      ctx.events?.emit('dragDrop:dragMove', { entityId: ctx.entityId, x: ctx.transform.x, y: ctx.transform.y })
    }
  }
}
