import { System } from '../Core/System';
import type { World } from '../Core/World';

export type InputState = {
  keysDown: Set<string>;
  justPressed: Set<string>;
  justReleased: Set<string>;
  bindKey: (binding: KeyBinding) => () => void;
};

export const RES_INPUT = 'input';
export const RES_INPUT_API = 'input_api';

export type InputApi = {
  bindKey: (binding: KeyBinding) => () => void;
  isDown: (code: string) => boolean;
  wasPressed: (code: string) => boolean;
  wasReleased: (code: string) => boolean;
  clearBindings: (code?: string) => void;
};

export type KeyBinding = {
  code: string; // e.g. "KeyW", "ArrowLeft", "Space"
  /**
   * If true, `onHold` may fire after `holdThresholdMs` while key remains down.
   */
  hold?: boolean;
  /**
   * Minimum down time before `onHold` can fire.
   * Default: 350ms.
   */
  holdThresholdMs?: number;
  /**
   * If set, `onHold` repeats every N ms after threshold.
   * If omitted, `onHold` fires once when threshold is crossed.
   */
  holdRepeatEveryMs?: number;

  onPress?: (ctx: KeyCallbackContext) => void;
  onRelease?: (ctx: KeyCallbackContext) => void;
  onHold?: (ctx: KeyHoldCallbackContext) => void;
};

export type KeyCallbackContext = {
  world: World;
  input: InputState;
  code: string;
};

export type KeyHoldCallbackContext = KeyCallbackContext & {
  heldMs: number;
};

export class InputSystem extends System {
  private input: InputState;
  private detach?: () => void;

  private pendingPressed = new Set<string>();
  private pendingReleased = new Set<string>();

  private keyDownMs = new Map<string, number>();
  private holdFired = new Set<string>();
  private holdRepeatAccMs = new Map<string, number>();

  private bindings = new Map<string, Map<string, KeyBinding>>(); // code -> id -> binding

  get singletonKey(): string {
    return 'InputSystem';
  }

  constructor() {
    super();
    const bindKey = (binding: KeyBinding) => this.bindKey(binding);
    this.input = {
      keysDown: new Set<string>(),
      justPressed: new Set<string>(),
      justReleased: new Set<string>(),
      bindKey,
    };
  }

  attach(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.input.keysDown.has(e.code)) this.pendingPressed.add(e.code);
      this.input.keysDown.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (this.input.keysDown.has(e.code)) this.pendingReleased.add(e.code);
      this.input.keysDown.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    this.detach = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }

  update(dt: number, world: World): void {
    if (!world.getResource<InputState>(RES_INPUT)) {
      world.setResource(RES_INPUT, this.input);
      if (!this.detach) this.attach();
    }
    if (!world.getResource<InputApi>(RES_INPUT_API)) {
      world.setResource(RES_INPUT_API, {
        bindKey: (binding: KeyBinding) => this.bindKey(binding),
        isDown: (code: string) => this.isDown(code),
        wasPressed: (code: string) => this.wasPressed(code),
        wasReleased: (code: string) => this.wasReleased(code),
        clearBindings: (code?: string) => this.clearBindings(code),
      });
    }

    // Publish per-frame events that happened since last tick
    this.input.justPressed = new Set(this.pendingPressed);
    this.input.justReleased = new Set(this.pendingReleased);
    this.pendingPressed.clear();
    this.pendingReleased.clear();

    // Fire press/release callbacks
    for (const code of this.input.justPressed) this.firePress(world, code);
    for (const code of this.input.justReleased) this.fireRelease(world, code);

    // Hold tracking
    const dtMs = Math.max(0, dt);
    for (const code of this.input.keysDown) {
      const next = (this.keyDownMs.get(code) ?? 0) + dtMs;
      this.keyDownMs.set(code, next);
      this.fireHold(world, code, next, dtMs);
    }

    // Reset state for keys released this frame
    for (const code of this.input.justReleased) {
      this.keyDownMs.delete(code);
      this.holdFired.delete(code);
      this.holdRepeatAccMs.delete(code);
    }
  }

  private bindKey(binding: KeyBinding): () => void {
    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`) as string;
    let byId = this.bindings.get(binding.code);
    if (!byId) {
      byId = new Map();
      this.bindings.set(binding.code, byId);
    }
    byId.set(id, binding);
    return () => {
      byId?.delete(id);
    };
  }

  isDown(code: string): boolean {
    return this.input.keysDown.has(code);
  }

  wasPressed(code: string): boolean {
    return this.input.justPressed.has(code);
  }

  wasReleased(code: string): boolean {
    return this.input.justReleased.has(code);
  }

  clearBindings(code?: string): void {
    if (code) {
      this.bindings.delete(code);
      return;
    }
    this.bindings.clear();
  }

  private firePress(world: World, code: string): void {
    const ctx: KeyCallbackContext = { world, input: this.input, code };
    const byId = this.bindings.get(code);
    if (!byId) return;
    for (const b of byId.values()) b.onPress?.(ctx);
  }

  private fireRelease(world: World, code: string): void {
    const ctx: KeyCallbackContext = { world, input: this.input, code };
    const byId = this.bindings.get(code);
    if (!byId) return;
    for (const b of byId.values()) b.onRelease?.(ctx);
  }

  private fireHold(world: World, code: string, heldMs: number, dtMs: number): void {
    const byId = this.bindings.get(code);
    if (!byId) return;

    for (const b of byId.values()) {
      if (!b.hold || !b.onHold) continue;
      const threshold = b.holdThresholdMs ?? 350;
      if (heldMs < threshold) continue;

      const ctx: KeyHoldCallbackContext = { world, input: this.input, code, heldMs };

      const repeatEvery = b.holdRepeatEveryMs;
      if (repeatEvery === undefined) {
        if (this.holdFired.has(code)) continue;
        this.holdFired.add(code);
        b.onHold(ctx);
      } else {
        const acc = (this.holdRepeatAccMs.get(code) ?? 0) + dtMs;
        if (acc >= repeatEvery) {
          this.holdRepeatAccMs.set(code, acc % repeatEvery);
          b.onHold(ctx);
        } else {
          this.holdRepeatAccMs.set(code, acc);
        }
      }
    }
  }
}

