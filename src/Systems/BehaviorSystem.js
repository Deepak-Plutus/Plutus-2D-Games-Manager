import { BaseSystem } from './BaseSystem.js';
import { BehaviorRegistry } from '../Behaviors/BehaviorRegistry.js';
import { COMPONENT_CAMERA, COMPONENT_TRANSFORM } from '../Components/index.js';
import { buildColliderList } from '../Core/CollisionService.js';

/**
 * Runs Construct-style behavior instances (movement, bounds, etc.).
 */
export class BehaviorSystem extends BaseSystem {
  static inputRequirements = { keyboard: true, pointer: true, wheel: false, gamepad: false };

  /**
   * @param {BehaviorRegistry} behaviorRegistry
   */
  constructor(behaviorRegistry) {
    super();
    this.behaviorRegistry = behaviorRegistry;
    this.layoutWidth = 800;
    this.layoutHeight = 600;
    /** @type {import('../Core/KeyboardInput.js').KeyboardInput | null} */
    this.input = null;
    /** @type {import('../Core/PointerInput.js').PointerInput | null} */
    this.pointer = null;
    /** @type {import('../Core/BehaviorEventHub.js').BehaviorEventHub | null} */
    this.events = null;
    /** @type {import('pixi.js').Container | null} */
    this.stage = null;
    /** Monotonic seconds since first update (for behavior history / sampling). */
    this.time = 0;
    /**
     * Shared scroll / shake state for {@link import('../Behaviors/ScrollToBehavior.js').ScrollToBehavior}.
     * @type {{ points: { x: number, y: number }[], shake: { timeLeft: number, magnitude: number, reducing: boolean, totalDuration: number } }}
     */
    this.scrollState = {
      points: [],
      shake: { timeLeft: 0, magnitude: 0, reducing: true, totalDuration: 0 },
    };
    /** @private */
    this._focusX = null;
    /** @private */
    this._focusY = null;
    /** @type {import('../Core/InputEventHub.js').InputEventHub | null} */
    this.inputHub = null;
    /** @type {import('../Core/InputCoordinator.js').InputCoordinator | null} */
    this.inputCoordinator = null;
    /** When true, {@link ScrollToBehavior} averaging is skipped for this frame */
    this._cameraOverridesScroll = false;
    /** Active camera zoom for current frame. */
    this._cameraZoom = 1;
  }

  /**
   * @param {number} w
   * @param {number} h
   * @param {import('../Core/KeyboardInput.js').KeyboardInput | null} input
   * @param {import('../Core/PointerInput.js').PointerInput | null} pointer
   * @param {import('../Core/BehaviorEventHub.js').BehaviorEventHub | null} events
   * @param {import('pixi.js').Container | null} stage world layer (camera scroll root), not full app.stage
   * @param {import('../Core/InputEventHub.js').InputEventHub | null} [inputHub]
   * @param {import('../Core/InputCoordinator.js').InputCoordinator | null} [inputCoordinator]
   */
  setRuntime(w, h, input, pointer, events, stage, inputHub = null, inputCoordinator = null) {
    this.layoutWidth = w;
    this.layoutHeight = h;
    this.input = input;
    this.pointer = pointer;
    this.events = events;
    this.stage = stage;
    this.inputHub = inputHub;
    this.inputCoordinator = inputCoordinator;
  }

  update(dt, world) {
    if (!this.enabled || !world) return;
    this.time += dt;
    const colliders = buildColliderList(world);
    this.scrollState.points.length = 0;

    for (const e of world.query('transform', 'behaviors')) {
      const tr = e.components.get('transform');
      const list = e.components.get('behaviors');
      if (!Array.isArray(list) || list.length === 0) continue;

      const display = e.components.get('display');
      const view = display?.view;
      const displaySize = view
        ? { width: view.width ?? 0, height: view.height ?? 0 }
        : { width: 0, height: 0 };

      this.behaviorRegistry.tick(e.id, tr, list, dt, world, {
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
        inputCoordinator: this.inputCoordinator,
      });
    }

    this._applyCameraFollow(dt, world);
    this._applyScrollCamera(dt);
  }

  /**
   * @param {number} dt
   * @param {import('../ECS/World.js').World} world
   */
  _applyCameraFollow(dt, world) {
    this._cameraOverridesScroll = false;
    this._cameraZoom = 1;
    /** @type {import('../Components/SceneComponents.js').Camera[]} */
    const cams = [];
    for (const ent of world.entities.values()) {
      const cam = ent.components.get(COMPONENT_CAMERA);
      if (!cam || cam.enabled === false) continue;
      cams.push(cam);
    }
    if (!cams.length) return;
    cams.sort((a, b) => b.priority - a.priority);
    const cam = cams[0];
    this._cameraZoom = Math.max(0.2, Number(cam.zoom ?? 1) || 1);

    let targetId = cam.followEntityId;
    if (targetId != null && !world.entities.has(targetId)) {
      targetId = null;
    }
    if (targetId == null && cam.followMetaName) {
      targetId = world.findEntityIdByMetaName(cam.followMetaName);
    }
    if (targetId == null && Number.isFinite(cam.followUid)) {
      targetId = world.findEntityIdByUid(cam.followUid);
    }
    if (targetId == null && cam.followObjectType) {
      const ids = world.findEntityIdsByObjectType(cam.followObjectType);
      if (ids.length) targetId = ids[0];
    }
    if (targetId == null) return;

    const tr = world.getComponent(targetId, COMPONENT_TRANSFORM);
    if (!tr) return;

    let tx = tr.x + cam.offsetX;
    let ty = tr.y + cam.offsetY;
    if (cam.boundLeft != null) tx = Math.max(tx, cam.boundLeft);
    if (cam.boundRight != null) tx = Math.min(tx, cam.boundRight);
    if (cam.boundTop != null) ty = Math.max(ty, cam.boundTop);
    if (cam.boundBottom != null) ty = Math.min(ty, cam.boundBottom);

    this._cameraOverridesScroll = true;

    if (cam.smoothSpeed <= 0) {
      this._focusX = tx;
      this._focusY = ty;
      return;
    }
    const k = 1 - Math.exp(-cam.smoothSpeed * dt);
    if (this._focusX == null) this._focusX = tx;
    if (this._focusY == null) this._focusY = ty;
    this._focusX += (tx - this._focusX) * k;
    this._focusY += (ty - this._focusY) * k;
  }

  /**
   * @param {number} dt
   */
  _applyScrollCamera(dt) {
    if (!this.stage) return;
    const shake = this.scrollState.shake;
    let ox = 0;
    let oy = 0;
    if (shake.timeLeft > 0) {
      shake.timeLeft = Math.max(0, shake.timeLeft - dt);
      const m = shake.reducing
        ? shake.magnitude * (shake.timeLeft / Math.max(1e-6, shake.totalDuration))
        : shake.magnitude;
      ox = (Math.random() - 0.5) * 2 * m;
      oy = (Math.random() - 0.5) * 2 * m;
    }

    const pts = this.scrollState.points;
    if (!this._cameraOverridesScroll && pts.length) {
      let sx = 0;
      let sy = 0;
      for (const p of pts) {
        sx += p.x;
        sy += p.y;
      }
      this._focusX = sx / pts.length;
      this._focusY = sy / pts.length;
    }

    if (this._focusX != null && this._focusY != null) {
      const zoom = Math.max(0.2, Number(this._cameraZoom ?? 1) || 1);
      this.stage.scale.set(zoom, zoom);
      this.stage.position.set(
        this.layoutWidth / 2 - this._focusX * zoom + ox,
        this.layoutHeight / 2 - this._focusY * zoom + oy,
      );
    } else {
      this.stage.scale.set(1, 1);
    }
  }
}
