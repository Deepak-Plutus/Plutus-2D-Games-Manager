import { System } from '../Core/System';
import type { World } from '../Core/World';
import * as PIXI from 'pixi.js';
import { RES_PIXI_APP } from './PixiAppSystem';

export type MouseState = {
  // Screen-space relative to canvas (CSS pixels)
  x: number;
  y: number;
  dx: number;
  dy: number;
  // World-space in stage coordinates
  worldX: number;
  worldY: number;
  worldDx: number;
  worldDy: number;
  // Buttons pressed (0: left, 1: middle, 2: right...)
  buttons: Set<number>;
  // True for a single frame after press/release
  justPressed: Set<number>;
  justReleased: Set<number>;
  // Wheel delta accumulated this frame
  wheelDeltaY: number;
  // Useful flags
  insideCanvas: boolean;

  bindButton: (binding: MouseButtonBinding) => () => void;
  bindMove: (binding: MouseMoveBinding) => () => void;
  bindWheel: (binding: MouseWheelBinding) => () => void;
};

export const RES_MOUSE = 'mouse';
export const RES_MOUSE_API = 'mouse_api';

export type MouseButtonBinding = {
  button: number; // 0 left, 1 middle, 2 right
  hold?: boolean;
  holdThresholdMs?: number;
  holdRepeatEveryMs?: number;
  onPress?: (ctx: MouseCallbackContext) => void;
  onRelease?: (ctx: MouseCallbackContext) => void;
  onHold?: (ctx: MouseHoldCallbackContext) => void;
};

export type MouseMoveBinding = {
  onMove: (ctx: MouseMoveCallbackContext) => void;
};

export type MouseWheelBinding = {
  onWheel: (ctx: MouseWheelCallbackContext) => void;
};

export type MouseCallbackContext = {
  world: World;
  mouse: MouseState;
  button: number;
};

export type MouseHoldCallbackContext = MouseCallbackContext & {
  heldMs: number;
};

export type MouseMoveCallbackContext = {
  world: World;
  mouse: MouseState;
};

export type MouseWheelCallbackContext = {
  world: World;
  mouse: MouseState;
  deltaY: number;
};

export type MouseApi = {
  bindButton: (binding: MouseButtonBinding) => () => void;
  bindMove: (binding: MouseMoveBinding) => () => void;
  bindWheel: (binding: MouseWheelBinding) => () => void;
  isButtonDown: (button: number) => boolean;
  wasButtonPressed: (button: number) => boolean;
  wasButtonReleased: (button: number) => boolean;
  getScreenPosition: () => { x: number; y: number };
  getWorldPosition: () => { x: number; y: number };
  clearBindings: () => void;
};

export class MouseInputSystem extends System {
  get singletonKey(): string {
    return 'MouseInputSystem';
  }

  private pendingPressed = new Set<number>();
  private pendingReleased = new Set<number>();
  private pendingWheelDeltaY = 0;
  private pendingDx = 0;
  private pendingDy = 0;
  private pendingWorldDx = 0;
  private pendingWorldDy = 0;
  private pendingMoved = false;

  private buttonDownMs = new Map<number, number>();
  private holdFired = new Set<number>();
  private holdRepeatAccMs = new Map<number, number>();

  private buttonBindings = new Map<number, Map<string, MouseButtonBinding>>();
  private moveBindings = new Map<string, MouseMoveBinding>();
  private wheelBindings = new Map<string, MouseWheelBinding>();

  private state: MouseState = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    worldX: 0,
    worldY: 0,
    worldDx: 0,
    worldDy: 0,
    buttons: new Set<number>(),
    justPressed: new Set<number>(),
    justReleased: new Set<number>(),
    wheelDeltaY: 0,
    insideCanvas: false,
    bindButton: (binding) => this.bindButton(binding),
    bindMove: (binding) => this.bindMove(binding),
    bindWheel: (binding) => this.bindWheel(binding),
  };

  private attached = false;
  private appRef?: PIXI.Application;

  update(dt: number, world: World): void {
    if (!world.getResource<MouseState>(RES_MOUSE)) {
      world.setResource(RES_MOUSE, this.state);
    }
    if (!world.getResource<MouseApi>(RES_MOUSE_API)) {
      world.setResource(RES_MOUSE_API, {
        bindButton: (binding: MouseButtonBinding) => this.bindButton(binding),
        bindMove: (binding: MouseMoveBinding) => this.bindMove(binding),
        bindWheel: (binding: MouseWheelBinding) => this.bindWheel(binding),
        isButtonDown: (button: number) => this.state.buttons.has(button),
        wasButtonPressed: (button: number) => this.state.justPressed.has(button),
        wasButtonReleased: (button: number) => this.state.justReleased.has(button),
        getScreenPosition: () => ({ x: this.state.x, y: this.state.y }),
        getWorldPosition: () => ({ x: this.state.worldX, y: this.state.worldY }),
        clearBindings: () => this.clearBindings(),
      });
    }

    // Publish per-frame events
    this.state.justPressed = new Set(this.pendingPressed);
    this.state.justReleased = new Set(this.pendingReleased);
    this.state.wheelDeltaY = this.pendingWheelDeltaY;
    this.state.dx = this.pendingDx;
    this.state.dy = this.pendingDy;
    this.state.worldDx = this.pendingWorldDx;
    this.state.worldDy = this.pendingWorldDy;
    this.pendingPressed.clear();
    this.pendingReleased.clear();
    this.pendingWheelDeltaY = 0;
    this.pendingDx = 0;
    this.pendingDy = 0;
    this.pendingWorldDx = 0;
    this.pendingWorldDy = 0;

    // Keep world mouse position in sync even when camera/stage moves
    // (for example while player moves and camera follows).
    this.refreshWorldPositionFromStage();

    // Fire button callbacks
    for (const b of this.state.justPressed) this.firePress(world, b);
    for (const b of this.state.justReleased) this.fireRelease(world, b);

    // Fire move callbacks
    if (this.pendingMoved || this.state.dx !== 0 || this.state.dy !== 0) {
      for (const m of this.moveBindings.values()) m.onMove({ world, mouse: this.state });
    }
    this.pendingMoved = false;

    // Fire wheel callbacks
    if (this.state.wheelDeltaY !== 0) {
      for (const w of this.wheelBindings.values()) w.onWheel({ world, mouse: this.state, deltaY: this.state.wheelDeltaY });
    }

    // Hold tracking
    const dtMs = Math.max(0, dt);
    for (const b of this.state.buttons) {
      const next = (this.buttonDownMs.get(b) ?? 0) + dtMs;
      this.buttonDownMs.set(b, next);
      this.fireHold(world, b, next, dtMs);
    }
    for (const b of this.state.justReleased) {
      this.buttonDownMs.delete(b);
      this.holdFired.delete(b);
      this.holdRepeatAccMs.delete(b);
    }

    if (this.attached) return;
    const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
    if (!app) return;

    this.appRef = app;
    this.attach(app);
    this.attached = true;
  }

  private refreshWorldPositionFromStage(): void {
    const app = this.appRef;
    if (!app) return;
    const global = new PIXI.Point(this.state.x, this.state.y);
    const worldPt = app.stage.toLocal(global);
    this.state.worldX = worldPt.x;
    this.state.worldY = worldPt.y;
  }

  private attach(app: PIXI.Application): void {
    const canvas = app.canvas;

    const toCanvasXY = (evt: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = evt.clientX - rect.left;
      const y = evt.clientY - rect.top;
      return { x, y };
    };

    const updateWorldXY = () => {
      // Convert from canvas/screen to world coords using Pixi's helpers
      const global = new PIXI.Point(this.state.x, this.state.y);
      const worldPt = app.stage.toLocal(global);
      const prevX = this.state.worldX;
      const prevY = this.state.worldY;
      this.state.worldX = worldPt.x;
      this.state.worldY = worldPt.y;
      this.pendingWorldDx += this.state.worldX - prevX;
      this.pendingWorldDy += this.state.worldY - prevY;
    };

    canvas.addEventListener('pointerenter', () => {
      this.state.insideCanvas = true;
    });

    canvas.addEventListener('pointerleave', () => {
      this.state.insideCanvas = false;
      this.state.buttons.clear();
    });

    canvas.addEventListener('pointermove', (evt) => {
      const p = toCanvasXY(evt);
      const prevX = this.state.x;
      const prevY = this.state.y;
      this.state.x = p.x;
      this.state.y = p.y;
      this.pendingDx += this.state.x - prevX;
      this.pendingDy += this.state.y - prevY;
      updateWorldXY();
      this.pendingMoved = true;
    });

    canvas.addEventListener('pointerdown', (evt) => {
      canvas.setPointerCapture(evt.pointerId);
      const p = toCanvasXY(evt);
      this.state.x = p.x;
      this.state.y = p.y;
      this.state.buttons.add(evt.button);
      this.pendingPressed.add(evt.button);
      updateWorldXY();
    });

    canvas.addEventListener('pointerup', (evt) => {
      const p = toCanvasXY(evt);
      this.state.x = p.x;
      this.state.y = p.y;
      this.state.buttons.delete(evt.button);
      this.pendingReleased.add(evt.button);
      updateWorldXY();
    });

    canvas.addEventListener(
      'wheel',
      (evt) => {
        this.pendingWheelDeltaY += evt.deltaY;
      },
      { passive: true },
    );

    // Let right-click be used by game/UX systems
    canvas.addEventListener('contextmenu', (evt) => evt.preventDefault());
  }

  private bindButton(binding: MouseButtonBinding): () => void {
    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`) as string;
    let byId = this.buttonBindings.get(binding.button);
    if (!byId) {
      byId = new Map();
      this.buttonBindings.set(binding.button, byId);
    }
    byId.set(id, binding);
    return () => {
      byId?.delete(id);
    };
  }

  private bindMove(binding: MouseMoveBinding): () => void {
    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`) as string;
    this.moveBindings.set(id, binding);
    return () => {
      this.moveBindings.delete(id);
    };
  }

  private bindWheel(binding: MouseWheelBinding): () => void {
    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`) as string;
    this.wheelBindings.set(id, binding);
    return () => {
      this.wheelBindings.delete(id);
    };
  }

  private firePress(world: World, button: number): void {
    const byId = this.buttonBindings.get(button);
    if (!byId) return;
    const ctx: MouseCallbackContext = { world, mouse: this.state, button };
    for (const b of byId.values()) b.onPress?.(ctx);
  }

  private fireRelease(world: World, button: number): void {
    const byId = this.buttonBindings.get(button);
    if (!byId) return;
    const ctx: MouseCallbackContext = { world, mouse: this.state, button };
    for (const b of byId.values()) b.onRelease?.(ctx);
  }

  private fireHold(world: World, button: number, heldMs: number, dtMs: number): void {
    const byId = this.buttonBindings.get(button);
    if (!byId) return;
    for (const b of byId.values()) {
      if (!b.hold || !b.onHold) continue;
      const threshold = b.holdThresholdMs ?? 350;
      if (heldMs < threshold) continue;
      const ctx: MouseHoldCallbackContext = { world, mouse: this.state, button, heldMs };
      const repeatEvery = b.holdRepeatEveryMs;
      if (repeatEvery === undefined) {
        if (this.holdFired.has(button)) continue;
        this.holdFired.add(button);
        b.onHold(ctx);
      } else {
        const acc = (this.holdRepeatAccMs.get(button) ?? 0) + dtMs;
        if (acc >= repeatEvery) {
          this.holdRepeatAccMs.set(button, acc % repeatEvery);
          b.onHold(ctx);
        } else {
          this.holdRepeatAccMs.set(button, acc);
        }
      }
    }
  }

  private clearBindings(): void {
    this.buttonBindings.clear();
    this.moveBindings.clear();
    this.wheelBindings.clear();
  }
}

