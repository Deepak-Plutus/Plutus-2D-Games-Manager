import type { Container } from 'pixi.js'
import { BaseSystem } from './BaseSystem.js'
import { BehaviorRegistry } from '../Behaviors/BehaviorRegistry.js'
import { COMPONENT_CAMERA, COMPONENT_TRANSFORM } from '../Components/index.js'
import { buildColliderList } from '../Core/CollisionService.js'
import type { World } from '../ECS/World.js'
import type { Camera } from '../Components/SceneComponents.js'
import type { Transform } from '../Components/Transform.js'
import type { KeyboardInput } from '../Core/KeyboardInput.js'
import type { PointerInput } from '../Core/PointerInput.js'
import type { BehaviorEventHub } from '../Core/BehaviorEventHub.js'
import type { InputEventHub } from '../Core/InputEventHub.js'
import type { InputCoordinator } from '../Core/InputCoordinator.js'

type ScrollPoint = { x: number; y: number }
type ShakeState = { timeLeft: number; magnitude: number; reducing: boolean; totalDuration: number }

/**
 * Runs entity behaviors and applies camera/scroll effects each frame.
 */
export class BehaviorSystem extends BaseSystem {
  static inputRequirements = { keyboard: true, pointer: true, wheel: false, gamepad: false }
  behaviorRegistry: BehaviorRegistry
  layoutWidth: number
  layoutHeight: number
  input: KeyboardInput | null
  pointer: PointerInput | null
  events: BehaviorEventHub | null
  stage: Container | null
  time: number
  scrollState: { points: ScrollPoint[]; shake: ShakeState }
  private _focusX: number | null
  private _focusY: number | null
  inputHub: InputEventHub | null
  inputCoordinator: InputCoordinator | null
  private _cameraOverridesScroll: boolean
  private _cameraZoom: number

  /**
   * @param {BehaviorRegistry} behaviorRegistry Behavior runtime dispatcher.
   */
  constructor (behaviorRegistry: BehaviorRegistry) {
    super()
    this.behaviorRegistry = behaviorRegistry
    this.layoutWidth = 800
    this.layoutHeight = 600
    this.input = null
    this.pointer = null
    this.events = null
    this.stage = null
    this.time = 0
    this.scrollState = {
      points: [],
      shake: { timeLeft: 0, magnitude: 0, reducing: true, totalDuration: 0 }
    }
    this._focusX = null
    this._focusY = null
    this.inputHub = null
    this.inputCoordinator = null
    this._cameraOverridesScroll = false
    this._cameraZoom = 1
  }

  /**
   * Provides runtime dependencies consumed by behavior ticks.
   *
   * @returns {void} Nothing.
   */
  setRuntime (
    w: number,
    h: number,
    input: KeyboardInput | null,
    pointer: PointerInput | null,
    events: BehaviorEventHub | null,
    stage: Container | null,
    inputHub: InputEventHub | null = null,
    inputCoordinator: InputCoordinator | null = null
  ): void {
    this.layoutWidth = w
    this.layoutHeight = h
    this.input = input
    this.pointer = pointer
    this.events = events
    this.stage = stage
    this.inputHub = inputHub
    this.inputCoordinator = inputCoordinator
  }

  /**
   * Updates all entity behaviors and camera state.
   *
   * @param {number} dt Delta time in seconds.
   * @param {World} world ECS world.
   * @returns {void} Nothing.
   */
  update (dt: number, world: World): void {
    if (!this.enabled || !world) return
    this.time += dt
    const colliders = buildColliderList(world)
    this.scrollState.points.length = 0

    for (const e of world.query('transform', 'behaviors')) {
      const tr = e.components.get('transform') as Transform | undefined
      const list = e.components.get('behaviors')
      if (!tr || !Array.isArray(list) || list.length === 0) continue

      const display = e.components.get('display') as { view?: { width?: number; height?: number } | null } | undefined
      const view = display?.view
      const displaySize = view ? { width: view.width ?? 0, height: view.height ?? 0 } : { width: 0, height: 0 }

      const runtime = {
        time: this.time,
        input: this.input,
        pointer: this.pointer,
        events: this.events,
        layoutWidth: this.layoutWidth,
        layoutHeight: this.layoutHeight,
        displaySize,
        displayView: view ?? null,
        stage: this.stage,
        colliders,
        scrollState: this.scrollState,
        inputHub: this.inputHub,
        inputCoordinator: this.inputCoordinator
      } as unknown as Parameters<BehaviorRegistry['tick']>[5]
      this.behaviorRegistry.tick(e.id, tr, list, dt, world, runtime)
    }

    this._applyCameraFollow(dt, world)
    this._applyScrollCamera(dt)
  }

  /**
   * Computes camera follow target and smoothing.
   */
  private _applyCameraFollow (dt: number, world: World): void {
    this._cameraOverridesScroll = false
    this._cameraZoom = 1
    const cams: Camera[] = []
    for (const ent of world.entities.values()) {
      const cam = ent.components.get(COMPONENT_CAMERA) as Camera | undefined
      if (!cam || cam.enabled === false) continue
      cams.push(cam)
    }
    if (!cams.length) return
    cams.sort((a, b) => b.priority - a.priority)
    const cam = cams[0]
    if (!cam) return
    this._cameraZoom = Math.max(0.2, Number(cam.zoom ?? 1) || 1)

    let targetId = cam.followEntityId
    if (targetId != null && !world.entities.has(targetId)) targetId = null
    if (targetId == null && cam.followMetaName) targetId = world.findEntityIdByMetaName(cam.followMetaName)
    if (targetId == null && Number.isFinite(cam.followUid ?? NaN) && cam.followUid != null)
      targetId = world.findEntityIdByUid(cam.followUid)
    if (targetId == null && cam.followObjectType) {
      const ids = world.findEntityIdsByObjectType(cam.followObjectType)
      if (ids.length && ids[0] != null) targetId = ids[0]
    }
    if (targetId == null) return

    const tr = world.getComponent<{ x: number; y: number }>(targetId, COMPONENT_TRANSFORM)
    if (!tr) return

    let tx = tr.x + cam.offsetX
    let ty = tr.y + cam.offsetY
    if (cam.boundLeft != null) tx = Math.max(tx, cam.boundLeft)
    if (cam.boundRight != null) tx = Math.min(tx, cam.boundRight)
    if (cam.boundTop != null) ty = Math.max(ty, cam.boundTop)
    if (cam.boundBottom != null) ty = Math.min(ty, cam.boundBottom)

    this._cameraOverridesScroll = true
    if (cam.smoothSpeed <= 0) {
      this._focusX = tx
      this._focusY = ty
      return
    }
    const k = 1 - Math.exp(-cam.smoothSpeed * dt)
    if (this._focusX == null) this._focusX = tx
    if (this._focusY == null) this._focusY = ty
    this._focusX += (tx - this._focusX) * k
    this._focusY += (ty - this._focusY) * k
  }

  /**
   * Applies final stage scale/position using focus and shake.
   */
  private _applyScrollCamera (dt: number): void {
    if (!this.stage) return
    const shake = this.scrollState.shake
    let ox = 0
    let oy = 0
    if (shake.timeLeft > 0) {
      shake.timeLeft = Math.max(0, shake.timeLeft - dt)
      const m = shake.reducing
        ? shake.magnitude * (shake.timeLeft / Math.max(1e-6, shake.totalDuration))
        : shake.magnitude
      ox = (Math.random() - 0.5) * 2 * m
      oy = (Math.random() - 0.5) * 2 * m
    }

    const pts = this.scrollState.points
    if (!this._cameraOverridesScroll && pts.length) {
      let sx = 0
      let sy = 0
      for (const p of pts) {
        sx += p.x
        sy += p.y
      }
      this._focusX = sx / pts.length
      this._focusY = sy / pts.length
    }

    if (this._focusX != null && this._focusY != null) {
      const zoom = Math.max(0.2, Number(this._cameraZoom ?? 1) || 1)
      this.stage.scale.set(zoom, zoom)
      this.stage.position.set(
        this.layoutWidth / 2 - this._focusX * zoom + ox,
        this.layoutHeight / 2 - this._focusY * zoom + oy
      )
    } else {
      this.stage.scale.set(1, 1)
    }
  }
}
