/**
 * Lightweight typed-ish event hub for input-related events.
 */
export class InputEventHub extends EventTarget {
  /**
   * Emits an input event.
   *
   * @param {string} type Event type.
   * @param {Record<string, unknown>} detail Event payload.
   * @returns {void} Nothing.
   */
  emit (type: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(type, { detail: { ...detail } }))
  }

  /**
   * Subscribes to an event type and returns an unsubscribe callback.
   *
   * @param {string} type Event type.
   * @param {(ev: CustomEvent<Record<string, unknown>>) => void} handler Event handler.
   * @param {AddEventListenerOptions | boolean | undefined} options Listener options.
   * @returns {() => void} Unsubscribe function.
   */
  on (
    type: string,
    handler: (ev: CustomEvent<Record<string, unknown>>) => void,
    options?: AddEventListenerOptions | boolean
  ): () => void {
    this.addEventListener(type, handler as EventListener, options)
    return () => this.off(type, handler, options)
  }

  /**
   * Unsubscribes an event handler.
   *
   * @param {string} type Event type.
   * @param {(ev: CustomEvent<Record<string, unknown>>) => void} handler Event handler.
   * @param {EventListenerOptions | boolean | undefined} options Listener options.
   * @returns {void} Nothing.
   */
  off (
    type: string,
    handler: (ev: CustomEvent<Record<string, unknown>>) => void,
    options?: EventListenerOptions | boolean
  ): void {
    this.removeEventListener(type, handler as EventListener, options)
  }

  /**
   * Subscribes once to an event type.
   *
   * @param {string} type Event type.
   * @param {(ev: CustomEvent<Record<string, unknown>>) => void} handler Event handler.
   * @returns {void} Nothing.
   */
  once (type: string, handler: (ev: CustomEvent<Record<string, unknown>>) => void): void {
    const wrapped = (ev: Event) => handler(ev as CustomEvent<Record<string, unknown>>)
    this.addEventListener(type, wrapped, { once: true })
  }
}
