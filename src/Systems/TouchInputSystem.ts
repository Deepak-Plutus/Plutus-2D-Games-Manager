import * as PIXI from 'pixi.js';
import { System } from '../Core/System';
import type { World } from '../Core/World';
import { RES_PIXI_APP } from './PixiAppSystem';

export type TouchPoint = {
  id: number;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  dx: number;
  dy: number;
  worldDx: number;
  worldDy: number;
  heldMs: number;
};

export type TouchState = {
  touches: Map<number, TouchPoint>;
  justStarted: number[];
  justEnded: number[];
  bind: (binding: TouchBinding) => () => void;
};

export const RES_TOUCH = 'touch';
export const RES_TOUCH_API = 'touch_api';

export type TouchBinding = {
  onStart?: (ctx: TouchCallbackContext) => void;
  onMove?: (ctx: TouchMoveCallbackContext) => void;
  onEnd?: (ctx: TouchCallbackContext) => void;
  hold?: boolean;
  holdThresholdMs?: number;
  holdRepeatEveryMs?: number;
  onHold?: (ctx: TouchHoldCallbackContext) => void;
};

export type TouchCallbackContext = {
  world: World;
  touch: TouchState;
  point: TouchPoint;
};

export type TouchMoveCallbackContext = TouchCallbackContext;

export type TouchHoldCallbackContext = TouchCallbackContext & {
  heldMs: number;
};

export type TouchApi = {
  bind: (binding: TouchBinding) => () => void;
  getActiveTouches: () => TouchPoint[];
  getTouchById: (id: number) => TouchPoint | undefined;
  clearBindings: () => void;
};

export class TouchInputSystem extends System {
  get singletonKey(): string {
    return 'TouchInputSystem';
  }

  private attached = false;

  private pendingStart: number[] = [];
  private pendingEnd: number[] = [];

  private bindings = new Map<string, TouchBinding>();
  private holdFired = new Set<number>();
  private holdRepeatAccMs = new Map<number, number>();

  private state: TouchState = {
    touches: new Map(),
    justStarted: [],
    justEnded: [],
    bind: (binding) => this.bind(binding),
  };

  update(dt: number, world: World): void {
    if (!world.getResource<TouchState>(RES_TOUCH)) world.setResource(RES_TOUCH, this.state);
    if (!world.getResource<TouchApi>(RES_TOUCH_API)) {
      world.setResource(RES_TOUCH_API, {
        bind: (binding: TouchBinding) => this.bind(binding),
        getActiveTouches: () => [...this.state.touches.values()],
        getTouchById: (id: number) => this.state.touches.get(id),
        clearBindings: () => this.clearBindings(),
      });
    }

    // Publish per-frame start/end lists
    this.state.justStarted = this.pendingStart;
    this.state.justEnded = this.pendingEnd;
    this.pendingStart = [];
    this.pendingEnd = [];

    // Update held times + fire holds
    const dtMs = Math.max(0, dt);
    for (const point of this.state.touches.values()) {
      point.heldMs += dtMs;
      for (const b of this.bindings.values()) this.fireHold(world, b, point, dtMs);
    }

    // Attach listeners once Pixi exists
    if (this.attached) return;
    const app = world.getResource<PIXI.Application>(RES_PIXI_APP);
    if (!app) return;
    this.attach(app, world);
    this.attached = true;
  }

  private bind(binding: TouchBinding): () => void {
    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`) as string;
    this.bindings.set(id, binding);
    return () => this.bindings.delete(id);
  }

  private attach(app: PIXI.Application, world: World): void {
    const canvas = app.canvas;

    const toCanvasXY = (t: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    const toWorld = (x: number, y: number) => {
      const global = new PIXI.Point(x, y);
      const pt = app.stage.toLocal(global);
      return { x: pt.x, y: pt.y };
    };

    const upsertPoint = (t: Touch, kind: 'start' | 'move') => {
      const id = t.identifier;
      const p = toCanvasXY(t);
      const w = toWorld(p.x, p.y);
      const prev = this.state.touches.get(id);
      const next: TouchPoint = prev
        ? {
            ...prev,
            x: p.x,
            y: p.y,
            worldX: w.x,
            worldY: w.y,
            dx: prev.dx + (p.x - prev.x),
            dy: prev.dy + (p.y - prev.y),
            worldDx: prev.worldDx + (w.x - prev.worldX),
            worldDy: prev.worldDy + (w.y - prev.worldY),
          }
        : {
            id,
            x: p.x,
            y: p.y,
            worldX: w.x,
            worldY: w.y,
            dx: 0,
            dy: 0,
            worldDx: 0,
            worldDy: 0,
            heldMs: 0,
          };

      this.state.touches.set(id, next);

      if (kind === 'start') {
        this.pendingStart.push(id);
        for (const b of this.bindings.values()) b.onStart?.({ world, touch: this.state, point: next });
      } else {
        for (const b of this.bindings.values()) b.onMove?.({ world, touch: this.state, point: next });
      }
    };

    canvas.addEventListener(
      'touchstart',
      (evt) => {
        evt.preventDefault();
        for (const t of Array.from(evt.changedTouches)) upsertPoint(t, 'start');
      },
      { passive: false },
    );

    canvas.addEventListener(
      'touchmove',
      (evt) => {
        evt.preventDefault();
        for (const t of Array.from(evt.changedTouches)) upsertPoint(t, 'move');
      },
      { passive: false },
    );

    canvas.addEventListener(
      'touchend',
      (evt) => {
        evt.preventDefault();
        for (const t of Array.from(evt.changedTouches)) {
          const id = t.identifier;
          const point = this.state.touches.get(id);
          if (point) {
            for (const b of this.bindings.values()) b.onEnd?.({ world, touch: this.state, point });
          }
          this.state.touches.delete(id);
          this.pendingEnd.push(id);
          this.holdFired.delete(id);
          this.holdRepeatAccMs.delete(id);
        }
      },
      { passive: false },
    );

    canvas.addEventListener(
      'touchcancel',
      (evt) => {
        evt.preventDefault();
        for (const t of Array.from(evt.changedTouches)) {
          const id = t.identifier;
          this.state.touches.delete(id);
          this.pendingEnd.push(id);
          this.holdFired.delete(id);
          this.holdRepeatAccMs.delete(id);
        }
      },
      { passive: false },
    );
  }

  private fireHold(world: World, binding: TouchBinding, point: TouchPoint, dtMs: number): void {
    if (!binding.hold || !binding.onHold) return;
    const threshold = binding.holdThresholdMs ?? 450;
    if (point.heldMs < threshold) return;

    const ctx: TouchHoldCallbackContext = { world, touch: this.state, point, heldMs: point.heldMs };
    const repeatEvery = binding.holdRepeatEveryMs;
    if (repeatEvery === undefined) {
      if (this.holdFired.has(point.id)) return;
      this.holdFired.add(point.id);
      binding.onHold(ctx);
    } else {
      const acc = (this.holdRepeatAccMs.get(point.id) ?? 0) + dtMs;
      if (acc >= repeatEvery) {
        this.holdRepeatAccMs.set(point.id, acc % repeatEvery);
        binding.onHold(ctx);
      } else {
        this.holdRepeatAccMs.set(point.id, acc);
      }
    }
  }

  private clearBindings(): void {
    this.bindings.clear();
  }
}

