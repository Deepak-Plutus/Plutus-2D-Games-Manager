/**
 * Device / input events (keyboard, pointer, wheel, drag, joystick, gamepad).
 * Separate from {@link BehaviorEventHub} (gameplay / behavior events).
 *
 * Listen with `on(type, handler)` or `addEventListener`.
 * Types include: `keyboard:down`, `keyboard:up`, `pointer:down`, `pointer:up`,
 * `pointer:move`, `wheel`, `drag:start`, `drag:move`, `drag:end`,
 * `joystick:virtual`, `gamepad:connected`, `gamepad:axis`, `gamepad:button`.
 */
export class InputEventHub extends EventTarget {
  /**
   * @param {string} type
   * @param {Record<string, unknown>} [detail]
   */
  emit(type, detail = {}) {
    this.dispatchEvent(new CustomEvent(type, { detail: { ...detail } }));
  }

  /**
   * @param {string} type
   * @param {(ev: CustomEvent) => void} handler
   * @param {AddEventListenerOptions | boolean} [options]
   */
  on(type, handler, options) {
    this.addEventListener(type, /** @type {EventListener} */ (handler), options);
    return () => this.off(type, handler, options);
  }

  /**
   * @param {string} type
   * @param {(ev: CustomEvent) => void} handler
   * @param {EventListenerOptions | boolean} [options]
   */
  off(type, handler, options) {
    this.removeEventListener(type, /** @type {EventListener} */ (handler), options);
  }

  /**
   * @param {string} type
   * @param {(ev: CustomEvent) => void} handler
   */
  once(type, handler) {
    const wrapped = (/** @type {CustomEvent} */ ev) => {
      handler(ev);
    };
    this.addEventListener(type, /** @type {EventListener} */ (wrapped), { once: true });
  }
}
