/**
 * Registers named systems and applies JSON `systems` blocks (enabled + configure).
 */
export class SystemRegistry {
  constructor() {
    /** @type {Array<{ name: string, system: import('../Systems/BaseSystem.js').BaseSystem }>} */
    this._entries = [];
  }

  /**
   * @param {string} name
   * @param {import('../Systems/BaseSystem.js').BaseSystem} system
   */
  register(name, system) {
    this._entries.push({ name, system });
  }

  /**
   * @param {Record<string, Record<string, unknown>>} [systemsJson]
   */
  applyConfig(systemsJson = {}) {
    for (const { name, system } of this._entries) {
      const block = systemsJson[name] ?? {};
      const enabled = block.enabled !== false;
      system.enabled = enabled;
      if (typeof system.configure === 'function') {
        system.configure(block);
      }
    }
  }

  /**
   * Starts subsystems that need lifecycle hooks (e.g. physics runner).
   */
  startLifecycle() {
    for (const { system } of this._entries) {
      if (system.enabled && typeof system.start === 'function') {
        system.start();
      }
    }
  }

  /**
   * @param {number} dtSeconds
   * @param {import('../ECS/World.js').World} world
   */
  update(dtSeconds, world) {
    for (const { system } of this._entries) {
      if (system.enabled && typeof system.update === 'function') {
        system.update(dtSeconds, world);
      }
    }
  }

  /**
   * Union of `static inputRequirements` from registered systems.
   * @param {boolean} [onlyEnabled] if true, skip systems with `enabled === false`
   * @returns {{ keyboard: boolean, pointer: boolean, wheel: boolean, gamepad: boolean }}
   */
  getMergedInputRequirements(onlyEnabled = false) {
    /** @type {{ keyboard: boolean, pointer: boolean, wheel: boolean, gamepad: boolean }} */
    const m = { keyboard: false, pointer: false, wheel: false, gamepad: false };
    for (const { system } of this._entries) {
      if (onlyEnabled && system.enabled === false) continue;
      const C = /** @type {typeof import('../Systems/BaseSystem.js').BaseSystem & { inputRequirements?: Partial<typeof m> }} */ (
        system.constructor
      );
      const r = C.inputRequirements;
      if (!r) continue;
      if (r.keyboard) m.keyboard = true;
      if (r.pointer) m.pointer = true;
      if (r.wheel) m.wheel = true;
      if (r.gamepad) m.gamepad = true;
    }
    return m;
  }
}
